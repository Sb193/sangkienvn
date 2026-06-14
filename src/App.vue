<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NDialogProvider, NNotificationProvider, darkTheme } from 'naive-ui'
import type { GlobalThemeOverrides } from 'naive-ui'
import { usePreferredDark } from '@vueuse/core'

const isDark = usePreferredDark()

const themeOverrides: GlobalThemeOverrides = {
  common: {
    borderRadius: '12px',
    primaryColor: '#06B6D4',
    primaryColorHover: '#0891B2',
    successColor: '#10B981',
    warningColor: '#F59E0B',
    errorColor: '#EF4444',
  },
  Message: {
    borderRadius: '12px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 16px -6px rgba(0, 0, 0, 0.05)',
    padding: '12px 18px',
    fontSize: '14px',
  },
  Notification: {
    borderRadius: '12px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 16px -6px rgba(0, 0, 0, 0.05)',
  }
}
</script>

<template>
  <n-config-provider :theme="isDark ? darkTheme : undefined" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <router-view />
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>
