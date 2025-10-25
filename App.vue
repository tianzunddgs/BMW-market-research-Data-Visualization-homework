<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import Papa from 'papaparse';
import * as echarts from 'echarts/core';
import 'echarts-gl';

import {
  TitleComponent, TooltipComponent, GridComponent, LegendComponent, ToolboxComponent,
  TimelineComponent, DataZoomComponent, VisualMapComponent,
} from 'echarts/components';
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts';
import { UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';

import NavBar from './components/NavBar.vue';
import { useVoiceRecognition } from './composables/useVoiceRecognition.js';

// 導入圖片資源
import earthTexture from './assets/earth.jpg';
import heightTexture from './assets/bathymetry_bw_composite_4k.jpg';


// 註冊 ECharts 組件
echarts.use([
  TitleComponent, TooltipComponent, GridComponent, LegendComponent, ToolboxComponent,
  TimelineComponent, DataZoomComponent, VisualMapComponent, BarChart, LineChart,
  PieChart, ScatterChart, CanvasRenderer, UniversalTransition,
]);

// ==========================================================
// 新增：相關係數(趨勢分析)輔助函數
// ==========================================================
function calculateCorrelation(data, xKey, yKey) {
  if (data.length < 2) return { r: 0, text: "数据不足，无法分析趋势" };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  const n = data.length;

  data.forEach(row => {
    const x = row[xKey];
    const y = row[yKey];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  });

  const numerator = (n * sumXY) - (sumX * sumY);
  const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));

  if (denominator === 0) return { r: 0, text: "数据恒定，无趋势变化" };

  const r = numerator / denominator;
  let text = "";
  if (r > 0.7) text = "呈现强烈的正相关关系";
  else if (r > 0.4) text = "呈现中度的正相关关系";
  else if (r > 0.1) text = "呈現弱的正相关关系";
  else if (r < -0.7) text = "呈现强烈的负相关关系";
  else if (r < -0.4) text = "呈现中度的负相关关系";
  else if (r < -0.1) text = "呈現弱的负相关关系";
  else text = "未发现显著相关关系";
  
  return { r: r.toFixed(3), text: text };
}


// --- 響應式狀態 (保持不變) ---
const allData = ref([]);
const loading = ref(true);
const error = ref(null);
const activeView = ref('globe-view');
const { isListening, transcript, error: voiceError, toggleListening } = useVoiceRecognition();
const voiceCommandStatus = ref('单击麦克风按钮开始语音控制');

const globeTransmissionFilter = ref('All');
const globeFuelFilter = ref('All');

const explorerYAxis = ref('Price_USD');
const explorerXAxis = ref('Mileage_KM');
const explorerRegion = ref('All');
const explorerFuel = ref('All');
const explorerTransmission = ref('All');
const axisOptions = ref([
    { value: 'Price_USD', text: '价格 (USD)' },
    { value: 'Mileage_KM', text: '里程 (KM)' },
    { value: 'Sales_Volume', text: '销量' },
    { value: 'Engine_Size_L', text: '发动机排量 (L)' },
]);
const regionOptions = ref([]);
const fuelOptions = ref([]);
const transmissionOptions = ref([]);

// --- 數據處理 (保持不變) ---
onMounted(() => {
  Papa.parse('/BMW sales data (2010-2024) (1).csv', {
    download: true,
    header: true,
    skipEmptyLines: true,
    transformHeader: header => header.trim(),
    complete: (results) => {
      const parsedData = results.data.map(row => ({
        ...row,
        Year: parseInt(row.Year, 10),
        Sales_Volume: parseInt(row.Sales_Volume, 10) || 0,
        Price_USD: parseInt(row.Price_USD, 10) || 0,
        Mileage_KM: parseInt(row.Mileage_KM, 10) || 0,
        Engine_Size_L: parseFloat(row.Engine_Size_L) || 0,
      }));
      allData.value = parsedData;

      regionOptions.value = ['All', ...new Set(parsedData.map(d => d.Region))];
      fuelOptions.value = ['All', ...new Set(parsedData.map(d => d.Fuel_Type))];
      transmissionOptions.value = ['All', ...new Set(parsedData.map(d => d.Transmission))];
      
      loading.value = false;
    },
    error: (err) => {
      error.value = 'Failed to load or parse data file.';
      loading.value = false;
    }
  });
});

// --- 視圖切換與語音命令處理 (保持不變) ---
const handleNavigation = (view) => {
  activeView.value = view;
};
watch(transcript, (newTranscript) => {
  if (!newTranscript) return;
  voiceCommandStatus.value = `识别到命令: "${newTranscript}"`;
  const command = newTranscript.toLowerCase();
  
  console.log("Voice command received:", command); // 添加日志

  // 导航命令
  if (command.includes('地球') || command.includes('全球')) activeView.value = 'globe-view';
  else if (command.includes('探索') || command.includes('动态')) activeView.value = 'dynamic-explorer';
  else if (command.includes('趋势') || command.includes('年度')) activeView.value = 'sales-over-time';
  else if (command.includes('车系')) activeView.value = 'sales-by-series';
  else if (command.includes('车型')) activeView.value = 'sales-by-model';
  else if (command.includes('地区')) activeView.value = 'sales-by-region';
  else if (command.includes('驱动模式')) activeView.value = 'dynamic-fuel-type';
  else if (command.includes('变速箱')) activeView.value = 'sales-by-transmission';
  
  // 筛选命令 (同时应用于3D地球和探索器)
  else if (activeView.value === 'dynamic-explorer' || activeView.value === 'globe-view') {
      if(command.includes('自动挡')) { 
          explorerTransmission.value = 'Automatic'; 
          globeTransmissionFilter.value = 'Automatic';
          voiceCommandStatus.value = "已筛选: 自动挡";
      } else if (command.includes('手动挡')) { 
          explorerTransmission.value = 'Manual'; 
          globeTransmissionFilter.value = 'Manual';
          voiceCommandStatus.value = "已筛选: 手动挡";
      } else if (command.includes('全部') || command.includes('重置')) { 
          // 同时重置两个模块的筛选
          explorerTransmission.value = 'All'; 
          globeTransmissionFilter.value = 'All';
          explorerFuel.value = 'All';
          globeFuelFilter.value = 'All';
          explorerRegion.value = 'All'; // 如果需要，也可以重置地区
          voiceCommandStatus.value = "已重置筛选";
      }
      // 添加对 Fuel Type 的筛选命令
      else if (command.includes('汽油')) {
          explorerFuel.value = 'Petrol';
          globeFuelFilter.value = 'Petrol';
          voiceCommandStatus.value = "已筛选: 汽油";
      } else if (command.includes('柴油')) {
          explorerFuel.value = 'Diesel';
          globeFuelFilter.value = 'Diesel';
          voiceCommandStatus.value = "已筛选: 柴油";
      } else if (command.includes('混合动力')) {
          explorerFuel.value = 'Hybrid';
          globeFuelFilter.value = 'Hybrid';
          voiceCommandStatus.value = "已筛选: 混合动力";
      } else if (command.includes('电动')) {
          explorerFuel.value = 'Electric';
          globeFuelFilter.value = 'Electric';
          voiceCommandStatus.value = "已筛选: 电动";
      }
  }
});


// ==========================================================
// 新增：為動態探索器計算過濾後的數據
// ==========================================================
const filteredExplorerData = computed(() => {
  return allData.value.filter(d => 
    (explorerRegion.value === 'All' || d.Region === explorerRegion.value) &&
    (explorerFuel.value === 'All' || d.Fuel_Type === explorerFuel.value) &&
    (explorerTransmission.value === 'All' || d.Transmission === explorerTransmission.value)
  );
});

// ==========================================================
// 新增：動態探索器的自動分析
// ==========================================================
const explorerAnalysis = computed(() => {
  const data = filteredExplorerData.value;
  if (data.length === 0) {
    return {
      totalSales: 0,
      modelCount: 0,
      avgPrice: 0,
      avgMileage: 0,
      correlation: { r: 0, text: "无数据" }
    };
  }
  
  const totalSales = data.reduce((sum, row) => sum + row.Sales_Volume, 0);
  const modelCount = data.length;
  const avgPrice = data.reduce((sum, row) => sum + row.Price_USD, 0) / modelCount;
  const avgMileage = data.reduce((sum, row) => sum + row.Mileage_KM, 0) / modelCount;
  
  const xLabel = axisOptions.value.find(opt => opt.value === explorerXAxis.value)?.text || explorerXAxis.value;
  const yLabel = axisOptions.value.find(opt => opt.value === explorerYAxis.value)?.text || explorerYAxis.value;
  
  const correlation = calculateCorrelation(data, explorerXAxis.value, explorerYAxis.value);
  correlation.text = `趋势分析 ( ${yLabel} vs ${xLabel} ): ${correlation.text}`;

  return {
    totalSales: totalSales.toLocaleString(),
    modelCount,
    avgPrice: avgPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
    avgMileage: avgMileage.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' KM',
    correlation
  };
});


// --- ECharts 配置 (所有圖表) ---

// 1. 全球3D銷量視圖 (保持不變)
const globeViewOptions = computed(() => {
  if (!allData.value.length) return {};
  const years = [...new Set(allData.value.map(row => row.Year))].sort();
  const regionCoords = {
    'Asia': [103.8, 31.2], 'Europe': [15.2, 54.5], 'North America': [-100, 39.8],
    'South America': [-58.3, -24.6], 'Middle East': [45, 29], 'Africa': [22, 1],
  };

  const timelineOptions = years.map(year => {
    const yearData = allData.value.filter(d => d.Year === year);
    const filteredData = yearData.filter(d => 
        (globeTransmissionFilter.value === 'All' || d.Transmission === globeTransmissionFilter.value) &&
        (globeFuelFilter.value === 'All' || d.Fuel_Type === globeFuelFilter.value)
    );
    const salesByRegion = filteredData.reduce((acc, row) => {
      acc[row.Region] = (acc[row.Region] || 0) + row.Sales_Volume;
      return acc;
    }, {});
    const seriesData = Object.entries(salesByRegion).map(([region, sales]) => ({
      name: region, value: [...regionCoords[region], sales] 
    }));
    return {
      title: { 
        text: `${year} BMW 全球銷量分布`,
        subtext: `筛选: ${globeTransmissionFilter.value} | ${globeFuelFilter.value}`
      },
      series: { data: seriesData }
    };
  });

  return {
    baseOption: {
      timeline: { axisType: 'category', autoPlay: true, playInterval: 2000, data: years },
      tooltip: { trigger: 'item', formatter: p => `${p.name}: ${p.value[2].toLocaleString()} 辆` },
      visualMap: {
        calculable: true, min: 0, max: 150000,
        inRange: {
          color: ['#313695', '#4575b4', '#74add1', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'],
          symbolSize: [30, 100]
        },
        textStyle: { color: '#000' }, left: 20, bottom: 20,
      },
      series: [{ type: 'scatter3D', coordinateSystem: 'globe', symbol: 'circle', blendMode: 'lighter', itemStyle: { opacity: 0.6 } }],
      globe: {
        baseTexture: earthTexture, heightTexture: heightTexture,
        shading: 'realistic', atmosphere: { show: true },
        viewControl: { autoRotate: false, distance: 150 }
      }
    },
    options: timelineOptions
  };
});

// 2. 年度動態探索器 (泡泡圖)
const dynamicExplorerOptions = computed(() => {
  if (!allData.value.length) return {};
  const years = [...new Set(allData.value.map(row => row.Year))].sort();
  const regions = regionOptions.value.filter(r => r !== 'All');
  
  // 使用已計算的過濾數據
  const data = filteredExplorerData.value;
  
  const seriesTemplates = regions.map(region => ({
    name: region, type: 'scatter', symbolSize: val => Math.sqrt(val[2]) / 2,
    emphasis: { focus: 'series', label: { show: true, formatter: (param) => param.data[3], position: 'top' } },
    data: [],
  }));
  
  const timelineOptions = years.map(year => {
    // 僅按年份過濾
    const yearData = data.filter(d => d.Year === year);

    const dataByRegion = regions.map(region => yearData.filter(d => d.Region === region)
        .map(d => [d[explorerXAxis.value], d[explorerYAxis.value], d.Sales_Volume, d.Model, d.Color, d.Transmission, d.Engine_Size_L, d.Fuel_Type, d.Sales_Classification])
    );
    return {
      title: { text: `${year} BMW 市场动态探索` },
      series: seriesTemplates.map((template, index) => ({ ...template, data: dataByRegion[index] }))
    };
  });
  return {
    baseOption: {
      timeline: { axisType: 'category', autoPlay: true, playInterval: 1200, data: years, label: { formatter: (value) => value }, controlStyle: { itemSize: 20 } },
      title: { subtext: '气泡大小代表销量', left: 'center' },
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          const data = params.data;
          return `<strong>型号: ${data[3]} (${params.seriesName})</strong><br/>
            ${axisOptions.value.find(opt => opt.value === explorerXAxis.value)?.text}: ${data[0]}<br/>
            ${axisOptions.value.find(opt => opt.value === explorerYAxis.value)?.text}: ${data[1]}<br/>
            销量: ${data[2]}<br/>
            颜色: ${data[4]}<br/>
            变速箱: ${data[5]}`;
        }
      },
      grid: { top: 100, bottom: 100, left: 80, right: 40 },
      xAxis: { type: 'value', name: axisOptions.value.find(opt => opt.value === explorerXAxis.value)?.text, nameLocation: 'middle', nameGap: 30, scale: true },
      yAxis: { type: 'value', name: axisOptions.value.find(opt => opt.value === explorerYAxis.value)?.text, nameLocation: 'middle', nameGap: 50, scale: true },
      legend: { data: regions, right: 20, top: 60 },
      visualMap: [{ show: false, dimension: 2, min: 0, max: 20000, inRange: { symbolSize: [5, 60] } }]
    },
    options: timelineOptions
  };
});

// ==========================================================
// 3. 年度總銷量趨勢 (Y 軸已修正)
// ==========================================================
const salesOverTimeOptions = computed(() => {
  const salesByYear = allData.value.reduce((acc, row) => { acc[row.Year] = (acc[row.Year] || 0) + row.Sales_Volume; return acc; }, {});
  const years = Object.keys(salesByYear).sort();
  const sales = years.map(year => salesByYear[year]);
  return { 
    title: { text: 'BMW Global Sales Volume Trend', left: 'center' }, 
    tooltip: { trigger: 'axis' }, 
    xAxis: { type: 'category', data: years }, 
    // 關鍵修改：設置 min: 'dataMin' 讓 Y 軸從數據最小值開始
    yAxis: { type: 'value', name: 'Sales Volume', min: 'dataMin' }, 
    series: [{ name: 'Sales Volume', type: 'line', smooth: true, data: sales }] 
  };
});

// 4. 車系銷量分析 (保持不變)
const salesBySeriesOptions = computed(() => {
  const getSeries = (model) => {
    if (model.startsWith('M')) return 'M Series'; if (model.startsWith('X')) return 'X Series';
    if (model.startsWith('i')) return 'i Series'; if (model.endsWith(' Series')) return 'Digital Series';
    return 'Other';
  };
  const salesBySeries = allData.value.reduce((acc, row) => { const series = getSeries(row.Model); acc[series] = (acc[series] || 0) + row.Sales_Volume; return acc; }, {});
  const data = Object.entries(salesBySeries).map(([name, value]) => ({ name, value }));
  return { title: { text: 'Sales Volume by Car Series', left: 'center' }, tooltip: { trigger: 'item' }, legend: { orient: 'vertical', left: 'left' }, series: [{ type: 'pie', radius: ['40%', '70%'], data: data }] };
});

// 5. 車型銷量分布 (保持不變)
const salesByModelOptions = computed(() => {
  const salesByModel = allData.value.reduce((acc, row) => { acc[row.Model] = (acc[row.Model] || 0) + row.Sales_Volume; return acc; }, {});
  const data = Object.entries(salesByModel).map(([name, value]) => ({ name, value }));
  return { title: { text: 'Sales Distribution by Model', left: 'center' }, tooltip: { trigger: 'item' }, legend: { orient: 'vertical', left: 'left' }, series: [{ type: 'pie', radius: '60%', data: data }] };
});

// 6. 地區銷量對比 (保持不變)
const salesByRegionOptions = computed(() => {
  const salesByRegion = allData.value.reduce((acc, row) => { acc[row.Region] = (acc[row.Region] || 0) + row.Sales_Volume; return acc; }, {});
  const regions = Object.keys(salesByRegion); const sales = regions.map(region => salesByRegion[region]);
  return { title: { text: 'Sales Volume by Region', left: 'center' }, tooltip: { trigger: 'axis' }, xAxis: { type: 'category', data: regions, axisLabel: { interval: 0, rotate: 30 } }, yAxis: { type: 'value' }, series: [{ type: 'bar', data: sales }] };
});

// 7. 驅動模式動態變化 (保持不變)
const dynamicFuelTypeOptions = computed(() => {
  const years = [...new Set(allData.value.map(row => row.Year))].sort();
  const fuelTypes = [...new Set(allData.value.map(row => row.Fuel_Type))];
  const options = years.map(year => {
    const yearData = allData.value.filter(row => row.Year === year);
    const salesByFuel = fuelTypes.map(fuel => {
      const totalSales = yearData.filter(row => row.Fuel_Type === fuel).reduce((sum, row) => sum + row.Sales_Volume, 0);
      return { name: fuel, value: totalSales };
    });
    return { title: { text: `Fuel Type Sales in ${year}` }, series: [{ data: salesByFuel }] };
  });
  return { baseOption: { timeline: { axisType: 'category', autoPlay: true, playInterval: 1500, data: years }, title: { subtext: 'Sales by fuel type', left: 'center' }, tooltip: { trigger: 'item' }, legend: { data: fuelTypes, orient: 'vertical', right: 10, top: 30 }, series: [{ type: 'pie', radius: '60%', center: ['50%', '55%'] }] }, options: options };
});

// 8. 變速箱銷量分析 (保持不變)
const salesByTransmissionOptions = computed(() => {
    const sales = allData.value.reduce((acc, row) => { acc[row.Transmission] = (acc[row.Transmission] || 0) + row.Sales_Volume; return acc; }, {});
    const data = Object.entries(sales).map(([name, value]) => ({name, value}));
    return { title: { text: 'Sales: Automatic vs Manual', left: 'center' }, tooltip: { trigger: 'axis' }, xAxis: { type: 'category', data: data.map(d => d.name) }, yAxis: { type: 'value' }, series: [{ type: 'bar', data: data.map(d => d.value), barWidth: '40%' }] };
});

</script>

<template>
  <div class="d-flex" style="min-height: 100vh;">
    <NavBar @navigate="handleNavigation" />

    <main class="flex-grow-1 p-4 main-content">
      <div class="voice-control-bar alert alert-secondary d-flex align-items-center">
        <button @click="toggleListening" class="btn btn-lg me-3" :class="isListening ? 'btn-danger' : 'btn-primary'">
          <i class="bi" :class="isListening ? 'bi-mic-mute-fill' : 'bi-mic-fill'"></i>
        </button>
        <div class="flex-grow-1">
          <small class="text-muted">{{ voiceCommandStatus }}</small>
          <div v-if="voiceError" class="text-danger small">{{ voiceError }}</div>
        </div>
      </div>

      <div v-if="loading" class="d-flex justify-content-center align-items-center h-100">
        <div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div>
      </div>
      <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
      
      <div v-else class="container-fluid pt-3">
        <div v-show="activeView === 'globe-view'">
           <div class="row g-3 align-items-center mb-4 p-3 bg-light border rounded">
               <div class="col-auto">
                   <label class="form-label fw-bold">变速箱筛选:</label>
                   <select class="form-select" v-model="globeTransmissionFilter">
                       <option v-for="opt in transmissionOptions" :key="opt" :value="opt">{{ opt }}</option>
                   </select>
               </div>
               <div class="col-auto">
                   <label class="form-label fw-bold">驱动方式筛选:</label>
                   <select class="form-select" v-model="globeFuelFilter">
                       <option v-for="opt in fuelOptions" :key="opt" :value="opt">{{ opt }}</option>
                   </select>
               </div>
           </div>
           <v-chart 
             :option="globeViewOptions" 
             autoresize 
             style="height: 75vh;"
             :key="`${globeTransmissionFilter}-${globeFuelFilter}`"
            />
        </div>

        <div v-show="activeView === 'dynamic-explorer'">
            <div class="row g-3 align-items-center mb-4 p-3 bg-light border rounded">
                <div class="col-auto"><label class="form-label fw-bold">Y轴:</label><select class="form-select" v-model="explorerYAxis"><option v-for="opt in axisOptions" :key="opt.value" :value="opt.value">{{ opt.text }}</option></select></div>
                <div class="col-auto"><label class="form-label fw-bold">X轴:</label><select class="form-select" v-model="explorerXAxis"><option v-for="opt in axisOptions" :key="opt.value" :value="opt.value">{{ opt.text }}</option></select></div>
                <div class="col-auto"><label class="form-label fw-bold">地区:</label><select class="form-select" v-model="explorerRegion"><option v-for="opt in regionOptions" :key="opt" :value="opt">{{ opt }}</option></select></div>
                <div class="col-auto"><label class="form-label fw-bold">燃料:</label><select class="form-select" v-model="explorerFuel"><option v-for="opt in fuelOptions" :key="opt" :value="opt">{{ opt }}</option></select></div>
                <div class="col-auto"><label class="form-label fw-bold">变速箱:</label><select class="form-select" v-model="explorerTransmission"><option v-for="opt in transmissionOptions" :key="opt" :value="opt">{{ opt }}</option></select></div>
            </div>

            <div class="alert alert-info" role="alert">
              <h5 class="alert-heading">筛选结果自动分析</h5>
              <p class="mb-2">
                <strong>{{ explorerAnalysis.correlation.text }}</strong>
                (相关系数 r: {{ explorerAnalysis.correlation.r }})
              </p>
              <hr>
              <ul class="list-group list-group-horizontal-md">
                <li class="list-group-item flex-fill"><strong>总销量:</strong> {{ explorerAnalysis.totalSales }} 辆</li>
                <li class="list-group-item flex-fill"><strong>总车型记录数:</strong> {{ explorerAnalysis.modelCount }}</li>
                <li class="list-group-item flex-fill"><strong>平均价格:</strong> {{ explorerAnalysis.avgPrice }}</li>
                <li class="list-group-item flex-fill"><strong>平均里程:</strong> {{ explorerAnalysis.avgMileage }}</li>
              </ul>
            </div>

            <v-chart 
              :option="dynamicExplorerOptions" 
              autoresize 
              style="height: 650px;" 
              :key="`${explorerXAxis}-${explorerYAxis}-${explorerRegion}-${explorerFuel}-${explorerTransmission}`"
            />
        </div>

        <div v-show="activeView === 'sales-over-time'"><v-chart :option="salesOverTimeOptions" autoresize style="height: 500px;" /></div>
        <div v-show="activeView === 'sales-by-series'"><v-chart :option="salesBySeriesOptions" autoresize style="height: 500px;" /></div>
        <div v-show="activeView === 'sales-by-model'"><v-chart :option="salesByModelOptions" autoresize style="height: 500px;" /></div>
        <div v-show="activeView === 'sales-by-region'"><v-chart :option="salesByRegionOptions" autoresize style="height: 500px;" /></div>
        <div v-show="activeView === 'dynamic-fuel-type'"><v-chart :option="dynamicFuelTypeOptions" autoresize style="height: 500px;" /></div>
        <div v-show="activeView === 'sales-by-transmission'"><v-chart :option="salesByTransmissionOptions" autoresize style="height: 500px;" /></div>
      </div>
    </main>
  </div>
</template>

<style>
body { background-color: #f8f9fa; }
.main-content { background-color: #ffffff; overflow-y: auto; height: 100vh; }
.echarts { width: 100%; }
.voice-control-bar { position: sticky; top: 10px; z-index: 1000; }
</style>