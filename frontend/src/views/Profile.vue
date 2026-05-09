<template>
  <section class="page-card">
    <div class="panel-title">
      <h3>个人中心</h3>
    </div>
    <div class="two-col">
      <div>
        <el-form ref="profileRef" :model="profile" :rules="profileRules" label-width="92px">
          <div class="form-grid" style="max-width: 900px;">
            <el-form-item label="姓名" prop="name"><el-input v-model="profile.name" /></el-form-item>
            <el-form-item label="邮箱" prop="email"><el-input v-model="profile.email" /></el-form-item>
            <el-form-item label="手机号" prop="phone"><el-input v-model="profile.phone" /></el-form-item>
            <el-form-item label="角色" class="full"><el-input :model-value="roleText[auth.role]" disabled /></el-form-item>
          </div>
          <el-button type="primary" :loading="savingProfile" @click="saveProfile">保存资料</el-button>
        </el-form>
      </div>
      <div>
        <el-form ref="passwordRef" :model="passwordForm" :rules="passwordRules" label-width="92px">
          <div class="form-grid" style="max-width: 560px;">
            <el-form-item label="原密码" prop="oldPassword" class="full"><el-input v-model="passwordForm.oldPassword" type="password" show-password /></el-form-item>
            <el-form-item label="新密码" prop="newPassword" class="full"><el-input v-model="passwordForm.newPassword" type="password" show-password /></el-form-item>
          </div>
          <el-button type="primary" :loading="savingPassword" @click="savePassword">修改密码</el-button>
        </el-form>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { authApi } from '../api/modules';
import { roleText } from '../utils/format';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const profileRef = ref();
const passwordRef = ref();
const savingProfile = ref(false);
const savingPassword = ref(false);
const profile = reactive({ name: '', email: '', phone: '' });
const passwordForm = reactive({ oldPassword: '', newPassword: '' });
const profileRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  email: [{
    trigger: 'blur',
    validator: (_, value, cb) => {
      if (!value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) cb();
      else cb(new Error('邮箱格式不正确'));
    }
  }],
  phone: [{
    trigger: 'blur',
    validator: (_, value, cb) => {
      if (!value || /^1[3-9]\d{9}$/.test(value)) cb();
      else cb(new Error('手机号格式不正确'));
    }
  }]
};
const passwordRules = { oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }], newPassword: [{ required: true, message: '请输入新密码', trigger: 'blur' }] };

async function loadProfile() { const user = await authApi.me(); Object.assign(profile, user); auth.user = user; localStorage.setItem('user', JSON.stringify(user)); }
async function saveProfile() { await profileRef.value.validate(async (valid) => { if (!valid) return; savingProfile.value = true; try { const user = await authApi.updateMe(profile); auth.user = user; localStorage.setItem('user', JSON.stringify(user)); ElMessage.success('个人资料已更新'); } finally { savingProfile.value = false; } }); }
async function savePassword() { await passwordRef.value.validate(async (valid) => { if (!valid) return; savingPassword.value = true; try { await authApi.updatePassword(passwordForm); ElMessage.success('密码已更新'); passwordForm.oldPassword = ''; passwordForm.newPassword = ''; } finally { savingPassword.value = false; } }); }
onMounted(loadProfile);
</script>
