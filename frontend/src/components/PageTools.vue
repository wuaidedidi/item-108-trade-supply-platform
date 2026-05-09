<template>
  <section class="page-card">
    <div class="toolbar">
      <div class="filter-group">
        <el-input v-model="inner.keyword" clearable :prefix-icon="Search" :placeholder="placeholder" @keyup.enter="$emit('search')" />
        <slot name="filters" />
        <el-button type="primary" :icon="Search" @click="$emit('search')">查询</el-button>
        <el-button :icon="Refresh" @click="$emit('reset')">重置</el-button>
      </div>
      <div class="action-group">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { Search, Refresh } from '@element-plus/icons-vue';

const props = defineProps({
  modelValue: { type: Object, required: true },
  placeholder: { type: String, default: '搜索关键词' }
});
const emit = defineEmits(['update:modelValue', 'search', 'reset']);
const inner = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});
</script>
