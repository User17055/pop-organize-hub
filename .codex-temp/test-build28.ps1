$baseCp=(Get-Content .codex-temp/junit-shared.args -Encoding UTF8)[2].Trim('"')
$testCp=$baseCp+';'+(Resolve-Path android/app/build/tmp/kotlin-classes/debugUnitTest).Path+';'+(Resolve-Path android/app/build/tmp/kotlin-classes/debug).Path
& 'C:/Program Files/Android/Android Studio/jbr/bin/java.exe' -Xmx256m -cp $testCp org.junit.runner.JUnitCore br.com.poporganize.app.data.CalendarAgendaTest br.com.poporganize.app.data.TaskRefreshTest br.com.poporganize.app.data.TaskSyncTest br.com.poporganize.app.data.TaskCompletionTest br.com.poporganize.app.data.TaskStatusDeliveryTest br.com.poporganize.shared.TaskSyncWireTest br.com.poporganize.shared.PopStoreSyncTest
if ($LASTEXITCODE -ne 0) { throw 'Falha nos testes Kotlin' }
