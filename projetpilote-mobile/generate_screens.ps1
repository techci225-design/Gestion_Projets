$screens = @(
  'ProjectSettings', 'ProjectLogframe', 'ProjectPtba', 'ProjectBudget',
  'ProjectOperations', 'ProjectImport', 'ProjectEvm', 'ProjectProcurement',
  'ProjectRisks', 'ProjectAudit'
)

New-Item -ItemType Directory -Force -Path .\screens\main\project | Out-Null

foreach ($s in $screens) {
  $content = @"
import React from 'react'
import { View, Text, SafeAreaView } from 'react-native'

export function ${s}Screen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
      <Text className="text-xl font-bold text-gray-500">${s} (En construction)</Text>
    </SafeAreaView>
  )
}
"@
  Set-Content -Path ".\screens\main\project\${s}Screen.tsx" -Value $content
}
