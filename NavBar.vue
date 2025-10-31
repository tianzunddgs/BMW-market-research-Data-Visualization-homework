<script setup>
import { ref } from 'vue';

const emit = defineEmits(['navigate']);
const activeItem = ref('globe-view'); 

const navigateTo = (view) => {
  activeItem.value = view;
  emit('navigate', view);
};
</script>

<template>
  <nav class="d-flex flex-column flex-shrink-0 p-3 text-white bg-dark sidebar">
    <a href="/" class="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none">
      <i class="bi bi-speedometer2 me-2 fs-4"></i>
      <span class="fs-4">BMW Dashboard</span>
    </a>
    <hr>
    <ul class="nav nav-pills flex-column mb-auto">
      <li class="nav-heading px-3 text-secondary text-uppercase" style="font-size: 0.8rem;">
        特色功能
      </li>
      <li class="nav-item">
        <a 
          href="#" 
          class="nav-link text-white" 
          :class="{ active: activeItem === 'globe-view' }"
          @click.prevent="navigateTo('globe-view')"
        >
          <i class="bi bi-globe-americas me-2"></i>
          全球3D销量视图
        </a>
      </li>
       <li class="nav-item">
        <a 
          href="#" 
          class="nav-link text-white" 
          :class="{ active: activeItem === 'dynamic-explorer' }"
          @click.prevent="navigateTo('dynamic-explorer')"
        >
          <i class="bi bi-rocket-takeoff-fill me-2"></i>
          年度动态探索器
        </a>
      </li>
      <hr>
      <li class="nav-heading px-3 text-secondary text-uppercase" style="font-size: 0.8rem;">
        常规分析
      </li>
      <li class="nav-item">
        <a 
          href="#" 
          class="nav-link text-white" 
          :class="{ active: activeItem === 'sales-over-time' }"
          @click.prevent="navigateTo('sales-over-time')"
        >
          <i class="bi bi-graph-up me-2"></i>
          年度销量趋势
        </a>
      </li>
      <li>
        <a 
          href="#" 
          class="nav-link text-white" 
          :class="{ active: activeItem === 'sales-by-series' }"
          @click.prevent="navigateTo('sales-by-series')"
        >
          <i class="bi bi-car-front-fill me-2"></i>
          车系销量分析
        </a>
      </li>
      <li>
        <a 
          href="#" 
          class="nav-link text-white" 
          :class="{ active: activeItem === 'sales-by-model' }"
          @click.prevent="navigateTo('sales-by-model')"
        >
          <i class="bi bi-pie-chart-fill me-2"></i>
          车型销量分布
        </a>
      </li>
       <li>
        <a 
          href="#" 
          class="nav-link text-white" 
          :class="{ active: activeItem === 'sales-by-region' }"
          @click.prevent="navigateTo('sales-by-region')"
        >
          <i class="bi bi-pin-map-fill me-2"></i>
          地区销量对比
        </a>
      </li>
      <li>
        <a 
          href="#" 
          class="nav-link text-white" 
          :class="{ active: activeItem === 'dynamic-fuel-type' }"
          @click.prevent="navigateTo('dynamic-fuel-type')"
        >
          <i class="bi bi-fuel-pump-fill me-2"></i>
          驱动模式动态变化
        </a>
      </li>
      <li>
        <a 
          href="#" 
          class="nav-link text-white" 
          :class="{ active: activeItem === 'sales-by-transmission' }"
          @click.prevent="navigateTo('sales-by-transmission')"
        >
          <i class="bi bi-gear-wide-connected me-2"></i>
          变速箱销量分析
        </a>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.sidebar {
  width: 280px;
  height: 100vh;
  position: sticky;
  top: 0;
}

.nav-link.active {
  background-color: #495057;
}

.nav-link:hover {
  background-color: #343a40;
}

</style>
