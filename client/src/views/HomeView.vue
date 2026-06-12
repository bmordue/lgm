<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useUserStore } from '@/stores/User.store'

const userStore = useUserStore()
const isAuthenticated = computed(() => userStore.isAuthenticated)
</script>

<template>
  <div class="home-container">
    <section class="hero">
      <div class="hero-content">
        <h1 class="brand-title">LGM</h1>
        <p class="tagline">A deep, turn-based tactical strategy game.</p>
        <p class="description">
          Experience the thrill of hex-based combat, strategic planning, and
          unpredictable outcomes in a world where every move counts.
        </p>

        <div class="cta-container">
          <RouterLink v-if="isAuthenticated" to="/dashboard" class="cta-btn primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            Go to Dashboard
          </RouterLink>
          <RouterLink v-else to="/login" class="cta-btn primary">
            Get Started
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
          </RouterLink>
          <RouterLink to="/about" class="cta-btn secondary">
            Learn More
          </RouterLink>
        </div>
      </div>
      <div class="hero-image" aria-hidden="true">
         <div class="hex-grid-decoration">
            <div class="hex"></div>
            <div class="hex"></div>
            <div class="hex"></div>
            <div class="hex"></div>
         </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 4rem 2rem;
}

.hero {
  display: flex;
  align-items: center;
  gap: 4rem;
  min-height: 60vh;
}

.hero-content {
  flex: 1.2;
}

.brand-title {
  font-size: clamp(3rem, 10vw, 5rem);
  font-weight: 900;
  color: hsla(160, 100%, 37%, 1);
  margin-bottom: 0.5rem;
  line-height: 1;
}

.tagline {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-heading);
  margin-bottom: 1.5rem;
}

.description {
  font-size: 1.1rem;
  color: var(--color-text);
  margin-bottom: 2.5rem;
  max-width: 500px;
  line-height: 1.6;
}

.cta-container {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 1.1rem;
  transition: all 0.2s;
  text-decoration: none;
}

.cta-btn:active {
  transform: scale(0.98);
}

.cta-btn.primary {
  background-color: hsla(160, 100%, 37%, 1);
  color: white;
}

.cta-btn.primary:hover {
  background-color: hsla(160, 100%, 37%, 0.8);
}

.cta-btn.secondary {
  border: 2px solid hsla(160, 100%, 37%, 1);
  color: hsla(160, 100%, 37%, 1);
}

.cta-btn.secondary:hover {
  background-color: hsla(160, 100%, 37%, 0.1);
}

.hero-image {
  flex: 0.8;
  display: flex;
  justify-content: center;
  position: relative;
}

.hex-grid-decoration {
  display: grid;
  grid-template-columns: repeat(2, 100px);
  gap: 10px;
  transform: rotate(15deg);
}

.hex {
  width: 100px;
  height: 115px;
  background-color: hsla(160, 100%, 37%, 0.05);
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  border: 2px solid hsla(160, 100%, 37%, 0.2);
}

.hex:nth-child(even) {
  margin-top: 57px;
}

@media (max-width: 768px) {
  .hero {
    flex-direction: column;
    text-align: center;
    gap: 2rem;
  }
  .description {
    margin-left: auto;
    margin-right: auto;
  }
  .cta-container {
    justify-content: center;
  }
  .hero-image {
    display: none;
  }
}
</style>
