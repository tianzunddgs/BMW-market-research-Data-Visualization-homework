
import 'bootstrap-icons/font/bootstrap-icons.css'; // <-- 添加这一行


import 'bootstrap/dist/css/bootstrap.min.css';
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)

app.mount('#app')
