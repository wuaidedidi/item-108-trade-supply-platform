<template>
  <PageTools v-model="query" placeholder="搜索申请标题或原因" @search="loadList" @reset="resetQuery">
    <template #filters>
      <el-select v-model="query.type" clearable placeholder="类型">
        <el-option label="采购申请" value="PURCHASE" />
        <el-option label="额度申请" value="QUOTA" />
        <el-option label="报销申请" value="REIMBURSEMENT" />
      </el-select>
      <el-select v-model="query.status" clearable placeholder="状态">
        <el-option label="待审核" value="PENDING" />
        <el-option label="已通过" value="APPROVED" />
        <el-option label="已驳回" value="REJECTED" />
      </el-select>
    </template>
    <template #actions>
      <el-button type="primary" :icon="Plus" @click="openForm">提交申请</el-button>
    </template>
    <el-table :data="items" border :loading="loading">
      <el-table-column prop="title" label="标题" min-width="170" />
      <el-table-column label="类型" min-width="110"><template #default="{ row }">{{ applicationTypeText[row.type] }}</template></el-table-column>
      <el-table-column label="金额" min-width="110"><template #default="{ row }">{{ money(row.amount) }}</template></el-table-column>
      <el-table-column label="状态" min-width="100"><template #default="{ row }"><StatusTag :value="row.status" /></template></el-table-column>
      <el-table-column label="申请人" min-width="120"><template #default="{ row }">{{ row.applicant?.name }}</template></el-table-column>
      <el-table-column label="审核人" min-width="120"><template #default="{ row }">{{ row.reviewer?.name || '-' }}</template></el-table-column>
      <el-table-column label="操作" min-width="200" fixed="right">
        <template #default="{ row }">
          <div class="table-actions">
            <el-button link type="primary" @click="showDetail(row)">详情</el-button>
            <el-button v-if="canReview && row.status === 'PENDING'" link type="primary" @click="reviewItem(row, 'APPROVED')">通过</el-button>
            <el-button v-if="canReview && row.status === 'PENDING'" link type="danger" @click="reviewItem(row, 'REJECTED')">驳回</el-button>
            <el-button v-if="canDelete(row)" link type="danger" @click="removeItem(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" layout="total, sizes, prev, pager, next" @current-change="loadList" @size-change="loadList" />
  </PageTools>

  <el-dialog v-model="formVisible" title="提交申请" width="720px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
      <div class="form-grid">
        <el-form-item label="标题" prop="title"><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="类型" prop="type"><el-select v-model="form.type" style="width: 100%;"><el-option label="采购申请" value="PURCHASE" /><el-option label="额度申请" value="QUOTA" /><el-option label="报销申请" value="REIMBURSEMENT" /></el-select></el-form-item>
        <el-form-item label="金额" prop="amount"><el-input v-model="form.amount" /></el-form-item>
        <el-form-item label="原因" prop="reason" class="full"><el-input v-model="form.reason" type="textarea" :rows="4" /></el-form-item>
      </div>
    </el-form>
    <template #footer><el-button @click="formVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></template>
  </el-dialog>

  <el-dialog v-model="reviewVisible" title="申请审核" width="640px">
    <el-form ref="reviewFormRef" :model="reviewForm" :rules="reviewRules" label-width="92px">
      <el-form-item label="审核结果" prop="status">
        <el-select v-model="reviewForm.status" style="width: 100%;"><el-option label="通过" value="APPROVED" /><el-option label="驳回" value="REJECTED" /></el-select>
      </el-form-item>
      <el-form-item label="审核意见" prop="comment"><el-input v-model="reviewForm.comment" type="textarea" :rows="4" /></el-form-item>
    </el-form>
    <template #footer><el-button @click="reviewVisible = false">取消</el-button><el-button type="primary" @click="confirmReview">提交</el-button></template>
  </el-dialog>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import PageTools from '../components/PageTools.vue';
import StatusTag from '../components/StatusTag.vue';
import { applicationApi } from '../api/modules';
import { applicationTypeText, money } from '../utils/format';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const canReview = computed(() => ['AUDITOR', 'ADMIN'].includes(auth.role));
const query = reactive({ page: 1, pageSize: 10, keyword: '', type: '', status: '' });
const items = ref([]);
const total = ref(0);
const loading = ref(false);
const formVisible = ref(false);
const reviewVisible = ref(false);
const saving = ref(false);
const currentId = ref(0);
const formRef = ref();
const reviewFormRef = ref();
const form = reactive({ title: '', type: 'PURCHASE', amount: '', reason: '' });
const reviewForm = reactive({ status: 'APPROVED', comment: '' });
const rules = { title: [{ required: true, message: '请输入申请标题', trigger: 'blur' }], amount: [{ required: true, message: '请输入申请金额', trigger: 'blur' }], reason: [{ required: true, message: '请输入申请原因', trigger: 'blur' }] };
const reviewRules = { status: [{ required: true, message: '请选择审核结果', trigger: 'change' }], comment: [{ required: true, message: '请输入审核意见', trigger: 'blur' }] };

async function loadList() { loading.value = true; try { const data = await applicationApi.list(query); items.value = data.items; total.value = data.total; } finally { loading.value = false; } }
function resetQuery() { Object.assign(query, { page: 1, pageSize: 10, keyword: '', type: '', status: '' }); loadList(); }
function openForm() { Object.assign(form, { title: '', type: 'PURCHASE', amount: '', reason: '' }); formVisible.value = true; }
function showDetail(row) { reviewVisible.value = false; ElMessage.info(`${row.title}：${row.reason}`); }
async function save() { await formRef.value.validate(async (valid) => { if (!valid) return; saving.value = true; try { await applicationApi.create(form); ElMessage.success('申请已提交'); formVisible.value = false; loadList(); } finally { saving.value = false; } }); }
function reviewItem(row, status) { currentId.value = row.id; reviewForm.status = status; reviewForm.comment = ''; reviewVisible.value = true; }
async function confirmReview() { await reviewFormRef.value.validate(async (valid) => { if (!valid) return; await applicationApi.review(currentId.value, reviewForm); ElMessage.success('审核已提交'); reviewVisible.value = false; loadList(); }); }
function canDelete(row) { return ['ADMIN'].includes(auth.role) || (row.status === 'PENDING' && row.applicant?.username === auth.user?.username); }
async function removeItem(row) { await ElMessageBox.confirm(`确定删除申请「${row.title}」吗？`, '删除申请', { type: 'warning' }); await applicationApi.remove(row.id); ElMessage.success('申请已删除'); loadList(); }
onMounted(loadList);
</script>
