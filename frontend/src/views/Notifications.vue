<template>
  <section class="page-card">
    <div class="panel-title">
      <h3>消息通知</h3>
      <el-button @click="readAll">全部已读</el-button>
    </div>
    <el-table :data="items" border :loading="loading">
      <el-table-column label="类型" min-width="100"><template #default="{ row }">{{ notificationTypeText[row.type] }}</template></el-table-column>
      <el-table-column prop="title" label="标题" min-width="180" />
      <el-table-column prop="content" label="内容" min-width="320" show-overflow-tooltip />
      <el-table-column label="状态" min-width="90"><template #default="{ row }"><el-tag :type="row.isRead ? 'success' : 'warning'">{{ row.isRead ? '已读' : '未读' }}</el-tag></template></el-table-column>
      <el-table-column label="时间" min-width="170"><template #default="{ row }">{{ dateTime(row.createdAt) }}</template></el-table-column>
      <el-table-column label="操作" min-width="120" fixed="right"><template #default="{ row }"><div class="table-actions"><el-button link type="primary" @click="markRead(row)" :disabled="row.isRead">标记已读</el-button></div></template></el-table-column>
    </el-table>
    <el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" layout="total, sizes, prev, pager, next" @current-change="loadList" @size-change="loadList" />
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { notificationApi } from '../api/modules';
import { dateTime, notificationTypeText } from '../utils/format';

const query = reactive({ page: 1, pageSize: 10, keyword: '', isRead: '' });
const items = ref([]);
const total = ref(0);
const loading = ref(false);

async function loadList() { loading.value = true; try { const data = await notificationApi.list(query); items.value = data.items; total.value = data.total; } finally { loading.value = false; } }
async function markRead(row) { await notificationApi.read(row.id); ElMessage.success('消息已读'); loadList(); }
async function readAll() { await notificationApi.readAll(); ElMessage.success('全部消息已读'); loadList(); }
onMounted(loadList);
</script>
