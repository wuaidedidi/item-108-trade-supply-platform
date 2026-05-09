import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import Login from '../views/Login.vue';
import Register from '../views/Register.vue';
import AppLayout from '../components/AppLayout.vue';
import Dashboard from '../views/Dashboard.vue';
import Products from '../views/Products.vue';
import Orders from '../views/Orders.vue';
import Applications from '../views/Applications.vue';
import Payments from '../views/Payments.vue';
import Reviews from '../views/Reviews.vue';
import Inventory from '../views/Inventory.vue';
import Notifications from '../views/Notifications.vue';
import Users from '../views/Users.vue';
import Profile from '../views/Profile.vue';

export const menuRoutes = [
  { path: '/dashboard', name: '工作台', icon: 'DataBoard', component: Dashboard },
  { path: '/products', name: '商品资源', icon: 'Goods', component: Products },
  { path: '/orders', name: '订单处理', icon: 'Tickets', component: Orders },
  { path: '/applications', name: '申请审核', icon: 'Checked', component: Applications },
  { path: '/payments', name: '结算记录', icon: 'Wallet', component: Payments, roles: ['ADMIN', 'FINANCE', 'AUDITOR', 'USER'] },
  { path: '/reviews', name: '评价反馈', icon: 'ChatDotRound', component: Reviews },
  { path: '/inventory', name: '库存额度', icon: 'Box', component: Inventory, roles: ['ADMIN', 'SUPPLIER', 'FINANCE', 'AUDITOR'] },
  { path: '/notifications', name: '消息通知', icon: 'Bell', component: Notifications },
  { path: '/users', name: '用户管理', icon: 'UserFilled', component: Users, roles: ['ADMIN', 'FINANCE', 'AUDITOR'] },
  { path: '/profile', name: '个人中心', icon: 'Setting', component: Profile, hidden: true }
];

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', component: Login },
    { path: '/register', component: Register },
    {
      path: '/',
      component: AppLayout,
      children: menuRoutes.map((route) => ({
        path: route.path.slice(1),
        component: route.component,
        meta: { title: route.name, roles: route.roles }
      }))
    }
  ]
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (['/login', '/register'].includes(to.path)) {
    return auth.isLoggedIn ? '/dashboard' : true;
  }
  if (!auth.isLoggedIn) return '/login';
  const roles = to.meta.roles;
  if (roles?.length && !roles.includes(auth.role)) return '/dashboard';
  return true;
});

export default router;
