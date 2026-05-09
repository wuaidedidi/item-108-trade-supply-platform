<template>
  <div class="auth-page">
    <section class="auth-card">
      <div class="auth-visual">
        <div>
          <div class="brand-line">交易与供需协同平台</div>
          <h1>把需求、商品、订单、审核与结算收拢到一条清晰链路里。</h1>
          <p>
            面向采购、供应、审核和财务协作场景，支持真实的新增、查询、筛选、编辑、删除与统计闭环，帮助团队更快完成交易、审批和结算。
          </p>
          <div class="auth-stats">
            <div class="auth-stat">
              <strong>8+</strong>
              <span>业务模块联动</span>
            </div>
            <div class="auth-stat">
              <strong>4</strong>
              <span>角色协作分工</span>
            </div>
            <div class="auth-stat">
              <strong>1</strong>
              <span>一键启动容器化交付</span>
            </div>
          </div>
        </div>
        <div class="flow-panel">
          <strong>业务闭环</strong>
          <span>用户提交需求 -> 审核或报价 -> 完成交易/结算 -> 反馈与运营分析</span>
          <div class="flow-steps">
            <div><strong>需求提交</strong><span>用户发起采购、报销或额度申请。</span></div>
            <div><strong>供应响应</strong><span>商家维护商品、接单并推进履约。</span></div>
            <div><strong>财务复核</strong><span>结算、退款和评价沉淀到看板。</span></div>
          </div>
        </div>
      </div>

      <div class="auth-form-wrap">
        <div class="auth-form">
          <h2>欢迎回来</h2>
          <p class="hint">使用账号登录后可进入工作台，查看订单、申请、结算、库存与通知。</p>
          <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @keyup.enter="handleLogin">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="form.username" size="large" placeholder="请输入用户名" />
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input v-model="form.password" size="large" type="password" show-password placeholder="请输入密码" />
            </el-form-item>
            <div class="auth-actions">
              <el-button type="primary" size="large" :loading="loading" @click="handleLogin">登录</el-button>
              <div>
                <el-button text @click="router.push('/register')">注册新账号</el-button>
              </div>
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
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();
const formRef = ref();
const loading = ref(false);
const form = reactive({ username: '', password: '' });
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};

async function handleLogin() {
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    loading.value = true;
    try {
      await auth.login(form);
      ElMessage.success('登录成功');
      router.push('/dashboard');
    } finally {
      loading.value = false;
    }
  });
}
</script>
