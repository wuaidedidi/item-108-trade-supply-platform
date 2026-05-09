<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">协</div>
        <div>
          <strong>供需协同</strong>
          <span>交易闭环平台</span>
        </div>
      </div>
      <el-menu :default-active="route.path" router class="side-menu">
        <el-menu-item v-for="item in visibleMenus" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.name }}</span>
        </el-menu-item>
      </el-menu>
    </aside>

    <div class="main-frame">
      <header class="topbar">
        <div>
          <h1>{{ route.meta.title || '工作台' }}</h1>
          <p>{{ subtitle }}</p>
        </div>
        <div class="top-actions">
          <el-badge :value="unread" :hidden="!unread" class="notice-badge">
            <el-button :icon="Bell" circle @click="router.push('/notifications')" />
          </el-badge>
          <el-dropdown>
            <button class="user-chip">
              <span>{{ auth.displayName }}</span>
              <small>{{ roleText[auth.role] }}</small>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="router.push('/profile')">个人中心</el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Bell } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { menuRoutes } from '../router';
import { useAuthStore } from '../stores/auth';
import { notificationApi } from '../api/modules';
import { roleText } from '../utils/format';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const unread = ref(0);

const visibleMenus = computed(() => menuRoutes.filter((item) => !item.hidden && (!item.roles || item.roles.includes(auth.role))));
const subtitle = computed(() => {
  const map = {
    USER: '提交需求、跟踪订单、查看结算与评价反馈',
    SUPPLIER: '维护资源、接收订单、更新履约与库存状态',
    AUDITOR: '处理申请、巡检交易风险和协同进度',
    FINANCE: '管理结算流水、退款状态和运营指标',
    ADMIN: '统筹用户、交易、资源、评价和运营看板'
  };
  return map[auth.role] || '管理交易与供需协作流程';
});

async function loadUnread() {
  const data = await notificationApi.list({ page: 1, pageSize: 1 });
  unread.value = data.unread;
}

function handleLogout() {
  auth.logout();
  ElMessage.success('已退出登录');
  router.push('/login');
}

onMounted(loadUnread);
</script>
