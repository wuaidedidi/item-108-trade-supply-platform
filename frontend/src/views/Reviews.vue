<template>
  <PageTools v-model="query" placeholder="搜索评价内容或订单号" @search="loadList" @reset="resetQuery">
    <template #actions>
      <el-button type="primary" :icon="Plus" @click="openForm">新增评价</el-button>
    </template>
    <el-table :data="items" border :loading="loading">
      <el-table-column prop="order.orderNo" label="订单号" min-width="160"><template #default="{ row }">{{ row.order?.orderNo }}</template></el-table-column>
      <el-table-column prop="product.name" label="商品" min-width="150"><template #default="{ row }">{{ row.product?.name }}</template></el-table-column>
      <el-table-column label="评分" min-width="90"><template #default="{ row }">{{ row.rating }}分</template></el-table-column>
      <el-table-column prop="content" label="评价内容" min-width="280" show-overflow-tooltip />
      <el-table-column label="评价人" min-width="120"><template #default="{ row }">{{ row.user?.name }}</template></el-table-column>
      <el-table-column label="操作" min-width="120" fixed="right"><template #default="{ row }"><div class="table-actions"><el-button v-if="isAdmin" link type="danger" @click="removeItem(row)">删除</el-button></div></template></el-table-column>
    </el-table>
    <el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" layout="total, sizes, prev, pager, next" @current-change="loadList" @size-change="loadList" />
  </PageTools>

  <el-dialog v-model="formVisible" title="新增评价" width="680px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
      <div class="form-grid">
        <el-form-item label="订单ID" prop="orderId"><el-input v-model="form.orderId" /></el-form-item>
        <el-form-item label="评分" prop="rating"><el-input v-model="form.rating" /></el-form-item>
        <el-form-item label="评价内容" prop="content" class="full"><el-input v-model="form.content" type="textarea" :rows="4" /></el-form-item>
      </div>
    </el-form>
    <template #footer><el-button @click="formVisible = false">取消</el-button><el-button type="primary" @click="save">保存</el-button></template>
  </el-dialog>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import PageTools from '../components/PageTools.vue';
import { reviewApi } from '../api/modules';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const isAdmin = computed(() => auth.role === 'ADMIN');
const query = reactive({ page: 1, pageSize: 10, keyword: '' });
const items = ref([]);
const total = ref(0);
const loading = ref(false);
const formVisible = ref(false);
const formRef = ref();
const form = reactive({ orderId: '', rating: 5, content: '' });
const rules = { orderId: [{ required: true, message: '请输入订单ID', trigger: 'blur' }], content: [{ required: true, message: '请输入评价内容', trigger: 'blur' }] };

async function loadList() { loading.value = true; try { const data = await reviewApi.list(query); items.value = data.items; total.value = data.total; } finally { loading.value = false; } }
function resetQuery() { Object.assign(query, { page: 1, pageSize: 10, keyword: '' }); loadList(); }
function openForm() { Object.assign(form, { orderId: '', rating: 5, content: '' }); formVisible.value = true; }
async function save() { await formRef.value.validate(async (valid) => { if (!valid) return; await reviewApi.create(form); ElMessage.success('评价已提交'); formVisible.value = false; loadList(); }); }
async function removeItem(row) { await ElMessageBox.confirm('确定删除该评价吗？', '删除评价', { type: 'warning' }); await reviewApi.remove(row.id); ElMessage.success('评价已删除'); loadList(); }
onMounted(loadList);
</script>
