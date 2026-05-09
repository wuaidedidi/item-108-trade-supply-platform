<template>
  <PageTools v-model="query" placeholder="搜索商品名称、分类或说明" @search="loadList" @reset="resetQuery">
    <template #filters>
      <el-select v-model="query.category" clearable placeholder="分类">
        <el-option v-for="item in categories" :key="item" :label="item" :value="item" />
      </el-select>
      <el-select v-model="query.status" clearable placeholder="状态">
        <el-option label="启用" value="ACTIVE" />
        <el-option label="停用" value="INACTIVE" />
      </el-select>
    </template>
    <template #actions>
      <el-button v-if="canEdit" type="primary" :icon="Plus" @click="openForm()">新增商品</el-button>
    </template>

    <el-table :data="items" border :loading="loading">
      <el-table-column prop="name" label="商品名称" min-width="180" />
      <el-table-column prop="category" label="分类" min-width="120" />
      <el-table-column prop="price" label="单价" min-width="110">
        <template #default="{ row }">{{ money(row.price) }}</template>
      </el-table-column>
      <el-table-column prop="unit" label="单位" min-width="90" />
      <el-table-column label="库存" min-width="110">
        <template #default="{ row }">{{ row.inventory?.quantity || 0 }}</template>
      </el-table-column>
      <el-table-column label="状态" min-width="100">
        <template #default="{ row }"><StatusTag :value="row.status" /></template>
      </el-table-column>
      <el-table-column label="供应方" min-width="140">
        <template #default="{ row }">{{ row.supplier?.name }}</template>
      </el-table-column>
      <el-table-column label="操作" min-width="180" fixed="right">
        <template #default="{ row }">
          <div class="table-actions">
            <el-button link type="primary" @click="showDetail(row)">详情</el-button>
            <el-button v-if="canEdit" link type="primary" @click="openForm(row)">编辑</el-button>
            <el-button v-if="canEdit" link type="danger" @click="removeItem(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" layout="total, sizes, prev, pager, next" @current-change="loadList" @size-change="loadList" />
  </PageTools>

  <el-drawer v-model="detailVisible" title="商品详情" size="420px">
    <div class="detail-grid" v-if="detail">
      <span>商品名称</span><strong>{{ detail.name }}</strong>
      <span>分类</span><strong>{{ detail.category }}</strong>
      <span>单价</span><strong>{{ money(detail.price) }}</strong>
      <span>单位</span><strong>{{ detail.unit }}</strong>
      <span>供应方</span><strong>{{ detail.supplier?.name }}</strong>
      <span>描述</span><strong>{{ detail.description }}</strong>
    </div>
  </el-drawer>

  <el-dialog v-model="formVisible" :title="editingId ? '编辑商品' : '新增商品'" width="760px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
      <div class="form-grid">
        <el-form-item label="商品名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="分类" prop="category"><el-input v-model="form.category" /></el-form-item>
        <el-form-item label="单价" prop="price"><el-input v-model="form.price" /></el-form-item>
        <el-form-item label="单位" prop="unit"><el-input v-model="form.unit" /></el-form-item>
        <el-form-item label="库存" prop="quantity"><el-input v-model="form.quantity" /></el-form-item>
        <el-form-item label="预警值" prop="warningLevel"><el-input v-model="form.warningLevel" /></el-form-item>
        <el-form-item label="状态" prop="status" class="full">
          <el-select v-model="form.status" style="width: 100%;">
            <el-option label="启用" value="ACTIVE" />
            <el-option label="停用" value="INACTIVE" />
          </el-select>
        </el-form-item>
        <el-form-item label="商品说明" prop="description" class="full"><el-input v-model="form.description" type="textarea" :rows="4" /></el-form-item>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="formVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import PageTools from '../components/PageTools.vue';
import StatusTag from '../components/StatusTag.vue';
import { productApi } from '../api/modules';
import { money } from '../utils/format';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const canEdit = computed(() => ['SUPPLIER', 'ADMIN'].includes(auth.role));
const query = reactive({ page: 1, pageSize: 10, keyword: '', status: '', category: '' });
const items = ref([]);
const total = ref(0);
const categories = ref([]);
const loading = ref(false);
const detailVisible = ref(false);
const detail = ref(null);
const formVisible = ref(false);
const formRef = ref();
const saving = ref(false);
const editingId = ref(0);
const form = reactive({ name: '', category: '', description: '', price: '', unit: '', status: 'ACTIVE', quantity: 0, warningLevel: 10 });
const rules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  category: [{ required: true, message: '请输入分类', trigger: 'blur' }],
  description: [{ required: true, message: '请输入商品说明', trigger: 'blur' }],
  price: [{ required: true, message: '请输入单价', trigger: 'blur' }],
  unit: [{ required: true, message: '请输入单位', trigger: 'blur' }]
};

async function loadList() {
  loading.value = true;
  try {
    const data = await productApi.list(query);
    items.value = data.items;
    total.value = data.total;
    categories.value = data.categories || [];
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  Object.assign(query, { page: 1, pageSize: 10, keyword: '', status: '', category: '' });
  loadList();
}

function showDetail(row) {
  detail.value = row;
  detailVisible.value = true;
}

function openForm(row) {
  editingId.value = row?.id || 0;
  Object.assign(form, row ? {
    name: row.name, category: row.category, description: row.description, price: row.price, unit: row.unit, status: row.status,
    quantity: row.inventory?.quantity || 0, warningLevel: row.inventory?.warningLevel || 10
  } : { name: '', category: '', description: '', price: '', unit: '', status: 'ACTIVE', quantity: 0, warningLevel: 10 });
  formVisible.value = true;
}

async function save() {
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    saving.value = true;
    try {
      if (editingId.value) {
        await productApi.update(editingId.value, form);
        ElMessage.success('商品已更新');
      } else {
        await productApi.create(form);
        ElMessage.success('商品已创建');
      }
      formVisible.value = false;
      loadList();
    } finally {
      saving.value = false;
    }
  });
}

async function removeItem(row) {
  await ElMessageBox.confirm(`确定删除商品「${row.name}」吗？`, '删除商品', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' });
  await productApi.remove(row.id);
  ElMessage.success('商品已删除');
  loadList();
}

onMounted(loadList);
</script>
