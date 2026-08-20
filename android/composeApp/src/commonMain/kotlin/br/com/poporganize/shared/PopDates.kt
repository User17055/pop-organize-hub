package br.com.poporganize.shared

import kotlinx.datetime.Clock
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.plus
import kotlinx.datetime.toLocalDateTime

/**
 * Datas em portugues para o commonMain.
 *
 * O Android resolve isso com `month.getDisplayName(TextStyle.FULL, Locale("pt","BR"))`, mas
 * `getDisplayName` e `Locale` vem do java.time e nao existem no iOS. O kotlinx-datetime 0.6.2 nao
 * tem localizacao nenhuma: `LocalDate.toString()` devolve sempre o ISO cru. Por isso os nomes ficam
 * declarados aqui, e esta e a unica copia deles no modulo compartilhado.
 *
 * Todo este arquivo se apoia so nas seis APIs de kotlinx-datetime que o PopStore ja usa e que ja
 * compilaram verde no CI. Sem SDK do Android nesta maquina o unico compilador e o workflow, e cada
 * aposta em binding custa um build inteiro -- ja houve duas surpresas assim nesta sessao.
 */
private val monthNames = listOf(
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
)

/**
 * O Android usa "S T Q Q S S D" no cabecalho da grade: segunda e sabado sao a mesma letra, e
 * quarta e quinta tambem. Tres letras cabem nas sete colunas de um iPhone e nao deixam duvida.
 */
internal val weekdayLabels = listOf("seg", "ter", "qua", "qui", "sex", "sáb", "dom")

internal fun parseIsoDate(value: String): LocalDate? =
    runCatching { LocalDate.parse(value) }.getOrNull()

internal fun todayDate(): LocalDate =
    Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date

/**
 * Numero ISO do dia da semana: 1 = segunda ... 7 = domingo.
 *
 * Sem `DayOfWeek.isoDayNumber` de proposito. `toEpochDays()` e membro de LocalDate e nao depende de
 * import nenhum, entao nao ha o que o binding do Kotlin/Native deixe de resolver. O dia 0 da epoca
 * (1970-01-01) caiu numa quinta-feira, dai o deslocamento de 3; `mod` devolve resto nao negativo,
 * entao datas anteriores a 1970 tambem saem certas.
 */
internal fun isoDayNumber(date: LocalDate): Int =
    ((date.toEpochDays().toLong() + 3).mod(7L) + 1).toInt()

/** Diferenca em dias, para comparar sem depender de `daysUntil`. */
internal fun daysBetween(from: LocalDate, to: LocalDate): Long =
    to.toEpochDays().toLong() - from.toEpochDays().toLong()

internal fun daysInMonth(year: Int, month: Int): Int {
    val first = LocalDate(year, month, 1)
    return daysBetween(first, first.plus(DatePeriod(months = 1))).toInt()
}

/** "Agosto 2026", para o cabecalho da grade mensal. */
internal fun monthTitle(year: Int, month: Int): String =
    "${monthNames[month - 1].replaceFirstChar { it.uppercase() }} $year"

/**
 * Cabecalho de dia da agenda: "Hoje", "Amanha", "Ontem" ou "seg, 25 de agosto".
 *
 * O ano so entra quando nao e o corrente. Numa agenda a esmagadora maioria das linhas e do ano em
 * curso, e repetir "de 2026" em todas elas so rouba largura de tela.
 */
/**
 * Rotulo de prazo de uma linha de tarefa: "Hoje • 09:00", "seg, 25 de agosto".
 *
 * Uma dueDate vazia ou fora do ISO e devolvida como veio, em vez de virar excecao ou sumir: e
 * texto livre no PopTask, sem nenhuma validacao de formato no tipo.
 */
internal fun taskDateLabel(dueDate: String, dueTime: String, today: LocalDate): String {
    val date = parseIsoDate(dueDate)
    val datePart = if (date == null) dueDate else dayHeaderLabel(date, today)
    return listOf(datePart, dueTime).filter { it.isNotBlank() }.joinToString(" • ")
}

internal fun dayHeaderLabel(date: LocalDate, today: LocalDate): String = when (daysBetween(today, date)) {
    0L -> "Hoje"
    1L -> "Amanhã"
    -1L -> "Ontem"
    else -> {
        val weekday = weekdayLabels[isoDayNumber(date) - 1]
        val base = "$weekday, ${date.dayOfMonth} de ${monthNames[date.monthNumber - 1]}"
        if (date.year == today.year) base else "$base de ${date.year}"
    }
}
