<template>
  <el-tag :type="statusType(value)" effect="light" round>{{ text || statusText[value] || value }}</el-tag>
</template>

<script setup>
import { statusText, statusType } from '../utils/format';

defineProps({
  value: { type: String, required: true },
  text: { type: String, default: '' }
});
</script>
