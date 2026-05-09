<template>
  <PageTools v-model="query" placeholder="搜索用户名、姓名或手机号" @search="loadList" @reset="resetQuery">
    <template #filters>
      <el-select v-model="query.role" clearable placeholder="角色">
        <el-option v-for="item in roles" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="query.status" clearable placeholder="状态">
        <el-option label="启用" value="ACTIVE" />
        <el-option label="禁用" value="DISABLED" />
      </el-select>
    </template>
    <template #actions>
      <el-button type="primary" :icon="Plus" @click="openForm">新增用户</el-button>
    </template>
    <el-table :data="items" border :loading="loading">
      <el-table-column prop="username" label="用户名" min-width="120" />
      <el-table-column prop="name" label="姓名" min-width="120" />
      <el-table-column label="角色" min-width="120"><template #default="{ row }">{{ roleText[row.role] }}</template></el-table-column>
      <el-table-column label="状态" min-width="100"><template #default="{ row }"><StatusTag :value="row.status" /></template></el-table-column>
      <el-table-column prop="phone" label="手机号" min-width="140" />
      <el-table-column prop="email" label="邮箱" min-width="180" />
      <el-table-column label="额度" min-width="120"><template #default="{ row }">{{ money(row.quota) }}</template></el-table-column>
      <el-table-column label="操作" min-width="180" fixed="right">
        <template #default="{ row }">
          <div class="table-actions">
            <el-button link type="primary" @click="openForm(row)">编辑</el-button>
            <el-button link type="danger" @click="removeItem(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" layout="total, sizes, prev, pager, next" @current-change="loadList" @size-change="loadList" />
  </PageTools>

  <el-dialog v-model="formVisible" :title="editingId ? '编辑用户' : '新增用户'" width="720px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
      <div class="form-grid">
        <el-form-item label="用户名" prop="username" v-if="!editingId"><el-input v-model="form.username" /></el-form-item>
        <el-form-item label="姓名" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" :disabled="editingId === auth.user?.id" style="width: 100%;">
            <el-option v-for="item in roles" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" :disabled="editingId === auth.user?.id" style="width: 100%;">
            <el-option label="启用" value="ACTIVE" />
            <el-option label="禁用" value="DISABLED" />
          </el-select>
        </el-form-item>
        <el-form-item label="邮箱" prop="email"><el-input v-model="form.email" /></el-form-item>
        <el-form-item label="手机号" prop="phone"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="额度" prop="quota" class="full"><el-input v-model="form.quota" /></el-form-item>
        <el-form-item v-if="!editingId" label="密码" prop="password" class="full"><el-input v-model="form.password" type="password" show-password /></el-form-item>
      </div>
    </el-form>
    <template #footer><el-button @click="formVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></template>
  </el-dialog>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import PageTools from '../components/PageTools.vue';
import StatusTag from '../components/StatusTag.vue';
import { userApi } from '../api/modules';
import { money, roleText } from '../utils/format';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const query = reactive({ page: 1, pageSize: 10, keyword: '', role: '', status: '' });
const items = ref([]);
const total = ref(0);
const loading = ref(false);
const formVisible = ref(false);
const saving = ref(false);
const editingId = ref(0);
const formRef = ref();
const form = reactive({ username: '', name: '', role: 'USER', status: 'ACTIVE', email: '', phone: '', quota: 50000, password: '123456' });
const roles = [
  { label: '普通用户', value: 'USER' },
  { label: '供应方', value: 'SUPPLIER' },
  { label: '审核员', value: 'AUDITOR' },
  { label: '财务管理员', value: 'FINANCE' },
  { label: '管理员', value: 'ADMIN' }
];
const rules = { username: [{ required: true, message: '请输入用户名', trigger: 'blur' }], name: [{ required: true, message: '请输入姓名', trigger: 'blur' }], password: [{ required: true, message: '请输入密码', trigger: 'blur' }] };

async function loadList() { loading.value = true; try { const data = await userApi.list(query); items.value = data.items; total.value = data.total; } finally { loading.value = false; } }
function resetQuery() { Object.assign(query, { page: 1, pageSize: 10, keyword: '', role: '', status: '' }); loadList(); }
function openForm(row) { editingId.value = row?.id || 0; Object.assign(form, row ? { username: row.username, name: row.name, role: row.role, status: row.status, email: row.email || '', phone: row.phone || '', quota: row.quota, password: '123456' } : { username: '', name: '', role: 'USER', status: 'ACTIVE', email: '', phone: '', quota: 50000, password: '123456' }); formVisible.value = true; }
async function save() { await formRef.value.validate(async (valid) => { if (!valid) return; saving.value = true; try { if (editingId.value) await userApi.update(editingId.value, form); else await userApi.create(form); ElMessage.success('用户已保存'); formVisible.value = false; loadList(); } finally { saving.value = false; } }); }
async function removeItem(row) { if (row.id === auth.user?.id) { ElMessage.error('不能删除自己的账号'); return; } await ElMessageBox.confirm(`确定删除用户「${row.name}」吗？`, '删除用户', { type: 'warning' }); await userApi.remove(row.id); ElMessage.success('用户已删除'); loadList(); }
onMounted(loadList);
</script>
