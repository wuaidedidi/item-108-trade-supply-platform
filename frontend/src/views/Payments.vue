<template>
  <PageTools v-model="query" placeholder="搜索结算单号或订单号" @search="loadList" @reset="resetQuery">
    <template #filters>
      <el-select v-model="query.status" clearable placeholder="状态">
        <el-option label="待结算" value="UNPAID" />
        <el-option label="已结算" value="PAID" />
        <el-option label="已退款" value="REFUNDED" />
      </el-select>
    </template>
    <template #actions>
      <el-button v-if="canEdit" type="primary" :icon="Plus" @click="openForm">新增结算</el-button>
    </template>
    <el-table :data="items" border :loading="loading">
      <el-table-column prop="paymentNo" label="结算单号" min-width="160" />
      <el-table-column label="订单号" min-width="150"><template #default="{ row }">{{ row.order?.orderNo }}</template></el-table-column>
      <el-table-column label="金额" min-width="110"><template #default="{ row }">{{ money(row.amount) }}</template></el-table-column>
      <el-table-column label="状态" min-width="100"><template #default="{ row }"><StatusTag :value="row.status" /></template></el-table-column>
      <el-table-column label="结算对象" min-width="120"><template #default="{ row }">{{ row.user?.name }}</template></el-table-column>
      <el-table-column label="操作" min-width="150" fixed="right">
        <template #default="{ row }">
          <div class="table-actions">
            <el-button v-if="canEdit" link type="primary" @click="openForm(row)">编辑</el-button>
            <el-button v-if="canEdit" link type="danger" @click="removeItem(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" layout="total, sizes, prev, pager, next" @current-change="loadList" @size-change="loadList" />
  </PageTools>

  <el-dialog v-model="formVisible" :title="editingId ? '编辑结算' : '新增结算'" width="660px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
      <div class="form-grid">
        <el-form-item label="订单ID" prop="orderId"><el-input v-model="form.orderId" /></el-form-item>
        <el-form-item label="金额" prop="amount"><el-input v-model="form.amount" /></el-form-item>
        <el-form-item label="状态" prop="status"><el-select v-model="form.status" style="width: 100%;"><el-option label="待结算" value="UNPAID" /><el-option label="已结算" value="PAID" /><el-option label="已退款" value="REFUNDED" /></el-select></el-form-item>
        <el-form-item label="备注" prop="note"><el-input v-model="form.note" /></el-form-item>
      </div>
    </el-form>
    <template #footer><el-button @click="formVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></template>
  </el-dialog>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import PageTools from '../components/PageTools.vue';
import StatusTag from '../components/StatusTag.vue';
import { paymentApi } from '../api/modules';
import { money } from '../utils/format';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const canEdit = computed(() => ['ADMIN', 'FINANCE'].includes(auth.role));
const query = reactive({ page: 1, pageSize: 10, keyword: '', status: '' });
const items = ref([]);
const total = ref(0);
const loading = ref(false);
const formVisible = ref(false);
const saving = ref(false);
const editingId = ref(0);
const formRef = ref();
const form = reactive({ orderId: '', amount: '', status: 'UNPAID', note: '' });
const rules = { orderId: [{ required: true, message: '请输入订单ID', trigger: 'blur' }], amount: [{ required: true, message: '请输入金额', trigger: 'blur' }] };

async function loadList() { loading.value = true; try { const data = await paymentApi.list(query); items.value = data.items; total.value = data.total; } finally { loading.value = false; } }
function resetQuery() { Object.assign(query, { page: 1, pageSize: 10, keyword: '', status: '' }); loadList(); }
function openForm(row) { editingId.value = row?.id || 0; Object.assign(form, row ? { orderId: row.order?.id || '', amount: row.amount, status: row.status, note: row.note || '' } : { orderId: '', amount: '', status: 'UNPAID', note: '' }); formVisible.value = true; }
async function save() { await formRef.value.validate(async (valid) => { if (!valid) return; saving.value = true; try { if (editingId.value) await paymentApi.update(editingId.value, form); else await paymentApi.create(form); ElMessage.success('结算记录已保存'); formVisible.value = false; loadList(); } finally { saving.value = false; } }); }
async function removeItem(row) { await ElMessageBox.confirm(`确定删除结算记录「${row.paymentNo}」吗？`, '删除结算', { type: 'warning' }); await paymentApi.remove(row.id); ElMessage.success('结算记录已删除'); loadList(); }
onMounted(loadList);
</script>
