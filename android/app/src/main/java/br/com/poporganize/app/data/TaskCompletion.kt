package br.com.poporganize.app.data

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

/** The screen's animation may be cancelled; the user's committed action must survive it. */
internal fun commitTaskBeforeAnimation(
    animationScope: CoroutineScope,
    commit: () -> Unit,
    animate: suspend () -> Unit,
): Job {
    commit()
    return animationScope.launch { animate() }
}
