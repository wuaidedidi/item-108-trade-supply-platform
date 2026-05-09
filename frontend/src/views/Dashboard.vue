<template>
  <div class="dashboard-stack">
    <div class="dashboard-grid">
      <MetricCard icon="Tickets" label="订单量" :value="metrics.orderTotal" hint="当前账号可见订单" />
      <MetricCard icon="TrendCharts" label="成交率" :value="`${metrics.dealRate}%`" hint="完成交易占比" />
      <MetricCard icon="Money" label="退款率" :value="`${metrics.refundRate}%`" hint="退款风险追踪" />
      <MetricCard icon="Star" label="评价分" :value="metrics.averageRating" hint="供应体验评分" />
      <MetricCard icon="Box" label="库存周转率" :value="metrics.inventoryTurnover" hint="月度库存周转" />
    </div>

    <div class="two-col">
      <section class="page-card">
        <div class="panel-title">
          <h3>业务状态分布</h3>
          <el-button text @click="loadData">刷新</el-button>
        </div>
        <div class="status-bars">
          <div v-for="item in statusGroups" :key="item.status" class="bar-line">
            <span>{{ statusText[item.status] || item.status }}</span>
            <div class="bar-track"><div class="bar-fill" :style="{ width: `${Math.min(100, item.count * 18)}%` }" /></div>
            <strong>{{ item.count }}</strong>
          </div>
        </div>
      </section>

      <section class="page-card">
        <div class="panel-title"><h3>待办概览</h3></div>
        <div class="detail-grid">
          <span>待审核申请</span><strong>{{ metrics.pendingApplications }}</strong>
          <span>待结算金额</span><strong>{{ money(metrics.settlementAmount) }}</strong>
          <span>未读消息</span><strong>{{ metrics.unreadNotifications }}</strong>
          <span>待处理账单</span><strong>{{ metrics.unpaidPayments }}</strong>
        </div>
      </section>
    </div>

    <section class="page-card" style="margin-top: 18px;">
      <div class="panel-title"><h3>最近订单</h3></div>
      <el-table :data="recentOrders" border>
        <el-table-column prop="orderNo" label="订单号" min-width="150" />
        <el-table-column label="商品" min-width="140">
          <template #default="{ row }">{{ row.product?.name }}</template>
        </el-table-column>
        <el-table-column label="买方" min-width="120">
          <template #default="{ row }">{{ row.buyer?.name }}</template>
        </el-table-column>
        <el-table-column label="供应方" min-width="120">
          <template #default="{ row }">{{ row.supplier?.name }}</template>
        </el-table-column>
        <el-table-column label="状态" min-width="110">
          <template #default="{ row }"><StatusTag :value="row.status" /></template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" min-width="170">
          <template #default="{ row }">{{ dateTime(row.updatedAt) }}</template>
        </el-table-column>
      </el-table>
    </section>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import MetricCard from '../components/MetricCard.vue';
import StatusTag from '../components/StatusTag.vue';
import { statsApi } from '../api/modules';
import { dateTime, money, statusText } from '../utils/format';

const metrics = reactive({
  orderTotal: 0,
  dealRate: 0,
  refundRate: 0,
  averageRating: 0,
  inventoryTurnover: 0,
  pendingApplications: 0,
  unpaidPayments: 0,
  unreadNotifications: 0,
  settlementAmount: 0
});
const statusGroups = ref([]);
const recentOrders = ref([]);

async function loadData() {
  const data = await statsApi.dashboard();
  Object.assign(metrics, data.metrics);
  statusGroups.value = data.statusGroups;
  recentOrders.value = data.recentOrders;
}

onMounted(loadData);
</script>
