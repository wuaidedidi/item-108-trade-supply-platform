<template>
  <div class="auth-page">
    <section class="auth-card">
      <div class="auth-visual">
        <div>
          <div class="brand-line">创建业务账号</div>
          <h1>让采购、供应、审核与财务在同一个系统里协同。</h1>
          <p>注册后默认拥有普通用户角色，可直接提交需求、查看消息并体验完整交易流程。</p>
          <div class="auth-stats">
            <div class="auth-stat"><strong>默认</strong><span>注册即启用普通用户角色</span></div>
            <div class="auth-stat"><strong>可追踪</strong><span>申请、订单与结算状态同步</span></div>
            <div class="auth-stat"><strong>可回看</strong><span>完整保留消息与评价记录</span></div>
          </div>
        </div>
      </div>
      <div class="auth-form-wrap">
        <div class="auth-form">
          <h2>注册账号</h2>
          <p class="hint">填写基础信息即可创建账号，邮箱和手机号支持空值提交，也支持格式校验。</p>
          <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
            <el-form-item label="用户名" prop="username"><el-input v-model="form.username" size="large" /></el-form-item>
            <el-form-item label="姓名" prop="name"><el-input v-model="form.name" size="large" /></el-form-item>
            <el-form-item label="邮箱" prop="email"><el-input v-model="form.email" size="large" /></el-form-item>
            <el-form-item label="手机号" prop="phone"><el-input v-model="form.phone" size="large" /></el-form-item>
            <el-form-item label="密码" prop="password"><el-input v-model="form.password" type="password" show-password size="large" /></el-form-item>
            <div class="auth-actions">
              <el-button type="primary" size="large" :loading="loading" @click="handleRegister">立即注册</el-button>
              <el-button text @click="router.push('/login')">返回登录</el-button>
            </div>
          </el-form>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { z } from 'zod';
import { authApi } from '../api/modules';

const router = useRouter();
const formRef = ref();
const loading = ref(false);
const form = reactive({ username: '', name: '', email: '', phone: '', password: '' });
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};

const registerSchema = z.object({
  email: z.string().trim().optional().nullable().transform((value) => value || null).refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), '邮箱格式不正确'),
  phone: z.string().trim().optional().nullable().transform((value) => value || null).refine((value) => !value || /^1[3-9]\d{9}$/.test(value), '手机号格式不正确')
});

async function handleRegister() {
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    const checked = registerSchema.safeParse({ email: form.email, phone: form.phone });
    if (!checked.success) {
      ElMessage.error(checked.error.issues[0].message);
      return;
    }
    loading.value = true;
    try {
      await authApi.register(form);
      ElMessage.success('注册成功，请登录');
      router.push('/login');
    } finally {
      loading.value = false;
    }
  });
}
</script>
