package br.com.poporganize.shared

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * Botao "Iniciar sessao com a Apple" desenhado pelo proprio sistema.
 *
 * A App Store Review 4.8 exige que o botao siga as Human Interface Guidelines -- fundo preto ou
 * branco, glifo da maca, proporcoes e traducao oficiais. Reproduzir isso em Compose significaria
 * perseguir um alvo que a Apple move a cada versao, e a revisao implica com o resultado. No iPhone
 * este composable devolve o ASAuthorizationAppleIDButton do sistema; no Android nao desenha nada,
 * porque nao existe login Apple por la.
 */
@Composable
expect fun AppleSignInButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    lightBackground: Boolean = false,
)
