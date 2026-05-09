<template>
  <PageTools v-model="query" placeholder="搜索商品名称或分类" @search="loadList" @reset="resetQuery">
    <el-table :data="items" border :loading="loading">
      <el-table-column label="商品" min-width="180"><template #default="{ row }">{{ row.product?.name }}</template></el-table-column>
      <el-table-column label="供应方" min-width="130"><template #default="{ row }">{{ row.product?.supplier?.name }}</template></el-table-column>
      <el-table-column prop="quantity" label="总库存" min-width="100" />
      <el-table-column prop="reserved" label="占用库存" min-width="100" />
      <el-table-column label="可用库存" min-width="100"><template #default="{ row }">{{ row.quantity - row.reserved }}</template></el-table-column>
      <el-table-column prop="warningLevel" label="预警值" min-width="100" />
      <el-table-column prop="turnoverMonthly" label="周转率" min-width="100" />
      <el-table-column label="操作" min-width="120" fixed="right"><template #default="{ row }"><div class="table-actions"><el-button link type="primary" @click="openForm(row)">调整</el-button></div></template></el-table-column>
    </el-table>
    <el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" layout="total, sizes, prev, pager, next" @current-change="loadList" @size-change="loadList" />
  </PageTools>

  <el-dialog v-model="formVisible" title="调整库存" width="640px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
      <div class="form-grid">
        <el-form-item label="总库存" prop="quantity"><el-input v-model="form.quantity" /></el-form-item>
        <el-form-item label="占用库存" prop="reserved"><el-input v-model="form.reserved" /></el-form-item>
        <el-form-item label="预警值" prop="warningLevel"><el-input v-model="form.warningLevel" /></el-form-item>
        <el-form-item label="周转率" prop="turnoverMonthly"><el-input v-model="form.turnoverMonthly" /></el-form-item>
      </div>
    </el-form>
    <template #footer><el-button @click="formVisible = false">取消</el-button><el-button type="primary" @click="save">保存</el-button></template>
  </el-dialog>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import PageTools from '../components/PageTools.vue';
import { inventoryApi } from '../api/modules';

const query = reactive({ page: 1, pageSize: 10, keyword: '' });
const items = ref([]);
const total = ref(0);
const loading = ref(false);
const formVisible = ref(false);
const currentId = ref(0);
const formRef = ref();
const form = reactive({ quantity: 0, reserved: 0, warningLevel: 0, turnoverMonthly: 0 });
const rules = { quantity: [{ required: true, message: '请输入总库存', trigger: 'blur' }], reserved: [{ required: true, message: '请输入占用库存', trigger: 'blur' }], warningLevel: [{ required: true, message: '请输入预警值', trigger: 'blur' }], turnoverMonthly: [{ required: true, message: '请输入周转率', trigger: 'blur' }] };

async function loadList() { loading.value = true; try { const data = await inventoryApi.list(query); items.value = data.items; total.value = data.total; } finally { loading.value = false; } }
function resetQuery() { Object.assign(query, { page: 1, pageSize: 10, keyword: '' }); loadList(); }
function openForm(row) { currentId.value = row.id; Object.assign(form, { quantity: row.quantity, reserved: row.reserved, warningLevel: row.warningLevel, turnoverMonthly: row.turnoverMonthly }); formVisible.value = true; }
async function save() { await formRef.value.validate(async (valid) => { if (!valid) return; await inventoryApi.update(currentId.value, form); ElMessage.success('库存已更新'); formVisible.value = false; loadList(); }); }
onMounted(loadList);
</script>
