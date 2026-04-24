<template>
  <div id="app">
    <header class="header">
      <div class="container">
        <nav class="nav">
          <router-link to="/requirements">需求跟踪</router-link>
          <router-link to="/">填写周报</router-link>
          <router-link to="/view">查看周报</router-link>
          <router-link to="/project-tasks">项目列表</router-link>
          <router-link to="/monthly-summary">月度总结</router-link>
        </nav>
      </div>
    </header>
    <main class="container">
      <router-view />
    </main>
    <footer class="footer-info">
      <span>Designed by 陈波, with Claude Code</span>
    </footer>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
.footer-info {
  position: fixed;
  bottom: 12px;
  right: 20px;
  font-size: 11px;
  color: #999;
  background: rgba(255, 255, 255, 0.85);
  padding: 4px 10px;
  border-radius: 4px;
  z-index: 999;
  pointer-events: none;
}
</style>
