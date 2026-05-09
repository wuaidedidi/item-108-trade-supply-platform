<template>
  <div class="metric-card">
    <div class="metric-icon">
      <el-icon><component :is="icon" /></el-icon>
    </div>
    <div>
      <span>{{ label }}</span>
      <strong>{{ value }}</strong>
      <small>{{ hint }}</small>
    </div>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: 'TrendCharts' },
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  hint: { type: String, default: '' }
});
</script>
