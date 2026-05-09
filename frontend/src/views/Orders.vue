<template>
  <PageTools v-model="query" placeholder="搜索订单号、备注或商品" @search="loadList" @reset="resetQuery">
    <template #filters>
      <el-select v-model="query.status" clearable placeholder="状态">
        <el-option v-for="item in statuses" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
    </template>
    <template #actions>
      <el-button type="primary" :icon="Plus" @click="openForm">新建订单</el-button>
    </template>
    <el-table :data="items" border :loading="loading">
      <el-table-column prop="orderNo" label="订单号" min-width="160" />
      <el-table-column prop="product.name" label="商品" min-width="150">
        <template #default="{ row }">{{ row.product?.name }}</template>
      </el-table-column>
      <el-table-column label="买方" min-width="120"><template #default="{ row }">{{ row.buyer?.name }}</template></el-table-column>
      <el-table-column label="供应方" min-width="120"><template #default="{ row }">{{ row.supplier?.name }}</template></el-table-column>
      <el-table-column prop="quantity" label="数量" min-width="90" />
      <el-table-column label="金额" min-width="110"><template #default="{ row }">{{ money(row.totalAmount) }}</template></el-table-column>
      <el-table-column label="状态" min-width="100"><template #default="{ row }"><StatusTag :value="row.status" /></template></el-table-column>
      <el-table-column label="操作" min-width="180" fixed="right">
        <template #default="{ row }">
          <div class="table-actions">
            <el-button link type="primary" @click="showDetail(row)">详情</el-button>
            <el-button link type="primary" @click="openForm(row)">编辑</el-button>
            <el-button link type="primary" @click="editStatus(row)">状态</el-button>
            <el-button v-if="canDelete" link type="danger" @click="removeItem(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" layout="total, sizes, prev, pager, next" @current-change="loadList" @size-change="loadList" />
  </PageTools>

  <el-drawer v-model="detailVisible" title="订单详情" size="440px">
    <div class="detail-grid" v-if="detail">
      <span>订单号</span><strong>{{ detail.orderNo }}</strong>
      <span>商品</span><strong>{{ detail.product?.name }}</strong>
      <span>数量</span><strong>{{ detail.quantity }}</strong>
      <span>单价</span><strong>{{ money(detail.unitPrice) }}</strong>
      <span>总额</span><strong>{{ money(detail.totalAmount) }}</strong>
      <span>备注</span><strong>{{ detail.remark || '-' }}</strong>
    </div>
  </el-drawer>

  <el-dialog v-model="formVisible" :title="editingId ? '调整订单' : '新建订单'" width="720px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
      <div class="form-grid">
        <el-form-item label="商品" prop="productId">
          <el-select v-model="form.productId" filterable :disabled="editingId > 0" placeholder="请选择商品" style="width: 100%;">
            <el-option v-for="item in productOptions" :key="item.id" :label="`${item.name} / ${item.category}`" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="数量" prop="quantity"><el-input v-model="form.quantity" /></el-form-item>
        <el-form-item label="期望日期" prop="expectedDate"><el-date-picker v-model="form.expectedDate" type="date" style="width: 100%;" placeholder="选择日期" /></el-form-item>
        <el-form-item label="备注" prop="remark"><el-input v-model="form.remark" /></el-form-item>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="formVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="saveOrder">保存</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="statusVisible" title="更新状态" width="420px">
    <el-select v-model="statusForm.status" style="width: 100%;">
      <el-option v-for="item in statuses" :key="item.value" :label="item.label" :value="item.value" />
    </el-select>
    <template #footer>
      <el-button @click="statusVisible = false">取消</el-button>
      <el-button type="primary" @click="saveStatus">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import PageTools from '../components/PageTools.vue';
import StatusTag from '../components/StatusTag.vue';
import { orderApi } from '../api/modules';
import { money } from '../utils/format';
import { useAuthStore } from '../stores/auth';
import { productApi } from '../api/modules';

const auth = useAuthStore();
const canDelete = computed(() => ['ADMIN', 'FINANCE'].includes(auth.role));
const query = reactive({ page: 1, pageSize: 10, keyword: '', status: '' });
const items = ref([]);
const total = ref(0);
const loading = ref(false);
const detailVisible = ref(false);
const detail = ref(null);
const formVisible = ref(false);
const statusVisible = ref(false);
const saving = ref(false);
const editingId = ref(0);
const form = reactive({ productId: '', quantity: '', expectedDate: '', remark: '' });
const statusForm = reactive({ status: 'PENDING_QUOTE' });
const statuses = [
  { label: '待报价', value: 'PENDING_QUOTE' },
  { label: '已报价', value: 'QUOTED' },
  { label: '已审核', value: 'APPROVED' },
  { label: '处理中', value: 'PROCESSING' },
  { label: '已发货', value: 'SHIPPED' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已退款', value: 'REFUNDED' },
  { label: '已取消', value: 'CANCELLED' }
];
const productOptions = ref([]);
const rules = {
  productId: [{ required: true, message: '请输入商品ID', trigger: 'blur' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }]
};

async function loadList() {
  loading.value = true;
  try {
    const data = await orderApi.list(query);
    items.value = data.items;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}
async function loadProducts() {
  const data = await productApi.list({ page: 1, pageSize: 100, keyword: '' });
  productOptions.value = data.items;
}
function resetQuery() { Object.assign(query, { page: 1, pageSize: 10, keyword: '', status: '' }); loadList(); }
function openForm(row) {
  if (row?.id) {
    editingId.value = row.id;
    Object.assign(form, {
      productId: row.productId,
      quantity: row.quantity,
      expectedDate: row.expectedDate ? row.expectedDate.slice(0, 10) : '',
      remark: row.remark || ''
    });
  } else {
    editingId.value = 0;
    Object.assign(form, { productId: '', quantity: '', expectedDate: '', remark: '' });
  }
  formVisible.value = true;
}
function showDetail(row) { detail.value = row; detailVisible.value = true; }
function editStatus(row) { editingId.value = row.id; statusForm.status = row.status; statusVisible.value = true; }
async function saveOrder() {
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    saving.value = true;
    try {
      if (editingId.value) {
        await orderApi.update(editingId.value, {
          quantity: form.quantity,
          expectedDate: form.expectedDate,
          remark: form.remark
        });
        ElMessage.success('订单已更新');
      } else {
        await orderApi.create(form);
        ElMessage.success('订单已提交');
      }
      formVisible.value = false;
      loadList();
    } finally { saving.value = false; }
  });
}
async function saveStatus() {
  await orderApi.update(editingId.value, { status: statusForm.status });
  ElMessage.success('订单状态已更新');
  statusVisible.value = false;
  loadList();
}
async function removeItem(row) {
  await ElMessageBox.confirm(`确定删除订单「${row.orderNo}」吗？`, '删除订单', { type: 'warning' });
  await orderApi.remove(row.id);
  ElMessage.success('订单已删除');
  loadList();
}
const formRef = ref();
onMounted(loadList);
onMounted(loadProducts);
</script>
