# Cost3D APP — etapa 6

Projeto Expo independente do backend Spring Boot, para Android, iOS e web. O site Thymeleaf continua no Criare3D.

## Executar

Use Node.js 24 ou superior.

1. No backend, configure `API_JWT_SECRET` e inicie na porta 8080. Sem a chave, o login da API responde 503.
2. Neste diretório execute `npm.cmd install`.
3. Copie `.env.example` para `.env.local` e ajuste `EXPO_PUBLIC_API_URL` (endereço do backend, sem `/api/v1`). Toda variável `EXPO_PUBLIC_` é pública: nunca coloque senhas ou chaves nela.
4. Execute `npm.cmd run web`, ou `npm.cmd start` e escaneie o QR code com o Expo Go compatível com o SDK do projeto.

| Ambiente | URL da API |
| --- | --- |
| Web no computador | http://localhost:8080 |
| Emulador Android padrão | http://10.0.2.2:8080 |
| iPhone ou Android físico | http://IPV4_DO_COMPUTADOR:8080 |
| Simulador iOS no macOS | http://localhost:8080 |

Sem variável, Android usa 10.0.2.2; iOS/web usam localhost. Celular físico e computador precisam estar na mesma rede e o firewall deve permitir a API. Reinicie o Expo após alterar o ambiente. O simulador iOS exige macOS; no Windows use um iPhone físico. Para builds de distribuição, use HTTPS.

## Login e tema

- Android/iOS: `/auth/login`, refresh no Expo SecureStore; access token em memória.
- Web: `/auth/web/login`, `/refresh` e `/logout`, com credentials e `X-Cost3D-Web: 1`. Refresh fica no cookie HttpOnly do backend; nenhum token vai para localStorage.
- Restauração da sessão ao abrir; uma única renovação compartilhada entre chamadas concorrentes, com no máximo uma repetição por chamada.
- Rotas protegidas, logout e alteração obrigatória de senha antes de acessar a loja.
- Tema marsala/off-white, nome e cores carregados de `/tenant`. ADMIN sem loja pode consultar a própria conta.
- Menu lateral a partir de 900 px e navegação inferior em telas menores.
- Início, Minha conta, Clientes e Movimentações compõem esta entrega. Cálculos, peças, materiais e registro de vendas continuam no site até a migração dos módulos.

O backend já permite `http://localhost:8081` e `http://127.0.0.1:8081`. Para outro endereço web configure `API_WEB_ORIGINS` no backend com as origens exatas, separadas por vírgulas, sem barra final. O cookie é SameSite=Strict: publique app e API no mesmo site (por exemplo app.seudominio.com e api.seudominio.com) com HTTPS; domínios de sites diferentes exigem outra estratégia de publicação. Nos navegadores com Web Locks, login, renovação e logout também são serializados entre abas. Navegadores sem esse recurso devem usar uma única aba para evitar rotação concorrente de refresh tokens.

## Contrato e validação

`src/api/openapi.json` veio de `Criare3D/target/api/openapi.json`. Os tipos são gerados, sem DTOs manuais paralelos:

```sh
npm.cmd run api:generate
# Ou com o backend em execução:
npm.cmd run api:generate -- http://localhost:8080/v3/api-docs
npm.cmd run typecheck
npm.cmd test
npm.cmd run export:web
```

Depois de alterar o contrato no backend, atualize o snapshot e regenere os tipos. O script também aceita o caminho para outro arquivo OpenAPI.

## Checklist manual

1. Abra web em 8081: veja Boas-vindas e teste campos vazios, senha incorreta e API desligada.
2. Entre com uma conta existente: confira e-mail, nome da loja e navegação.
3. Recarregue: a sessão deve ser restaurada. Abra `/home` sem sessão: deve voltar ao login.
4. Redimensione entre 360 e 1280 px: menu inferior/lateral, campos acessíveis e sem corte horizontal.
5. Repita o login no Android e iPhone. Feche e abra o app: a sessão deve ser restaurada.
6. Deixe o access token expirar (15 min) e acesse a conta: deve renovar a sessão.
7. Saia e tente voltar para uma rota protegida. Reinicie o app: deve permanecer desconectado.
8. Em uma conta de teste com troca obrigatória, altere a senha e faça novo login.
9. Confirme que o site existente continua funcionando.

Os testes locais de autenticação usam fetch simulado e não alteram o banco. Login real e validação visual em dispositivos precisam do backend e das contas de teste.


## Telas e visual

- Paleta base igual à do login do site: marsala `#86202D`, off-white `#F4EEE4`, campos claros e cartões com borda discreta. Login em duas colunas no desktop e compacto no celular, reutilizando o robô original.
- `ThemeProvider` dentro do layout autenticado distribui `primary`, `accent`, `background` e cores derivadas para todas as telas. O texto dos botões muda conforme o contraste da cor escolhida pela loja. Antes do login, usa-se a marca Cost3D, pois a loja ainda não é conhecida.
- O layout só contém navegação e o espaço da tela. `Screen` controla o scroll das páginas de formulário; Clientes e Extrato usam `FlatList` com páginas de 20 registros, sem scroll vertical externo.
- Clientes: busca, ativos/arquivados, cadastro, detalhes, edição com versão, arquivamento com confirmação e restauração. Conflitos 409 exigem recarregar antes de salvar novamente.
- Movimentações: busca, tipos, datas, entradas/saídas, período completo, saldos iniciais, resumo, paginação e limpar filtros. Filtros extras ficam recolhidos no celular.
- Os filtros aplicados permanecem ao mudar de tela e voltar, até limpar ou encerrar a sessão; não são gravados em armazenamento permanente.
- Valores decimais são formatados a partir das strings da API, sem perder precisão com ponto flutuante. Filamentos aparecem em kg/g; peças vendidas usam un. Datas são exibidas no fuso America/Sao_Paulo.
- O módulo de sessão mantém a mesma lógica; nesta entrega recebeu apenas formatação. As novas telas usam `request<T>()` e aliases dos tipos OpenAPI gerados.

## Checklist das telas novas

1. Com backend e app rodando, entre com uma conta de loja. Confira Início, Conta, Clientes e Extrato no menu.
2. Em uma conta de teste, cadastre um cliente só com o nome. Confira detalhes, adicione contato, salve e volte para a lista.
3. Busque pelo nome, abra os detalhes e volte: a busca deve permanecer. Limpe os filtros e confira a lista completa.
4. Arquive um cliente de teste após confirmar. Procure na aba Arquivados e restaure.
5. Edite o mesmo cliente em duas abas: após salvar na primeira, a segunda deve apresentar conflito e pedir para recarregar.
6. No Extrato, alterne Todos/Ajustes/Produção e volte para Todos. Use busca, datas, direção, período completo e Limpar filtros. Confira a paginação com mais de 20 registros.
7. Confira Produção como material + cor + etiqueta, com peça e horário abaixo. Verifique kg/g e peças vendidas em un.; vendas de produtos seguem os totais enviados pelo backend.
8. Com uma loja que já use outra paleta, confira botões no Início, Conta e Clientes. Cores claras devem receber texto escuro, e cores escuras texto claro.
9. Teste janela estreita e celular: filtros extras recolhidos, cartões legíveis, teclado sem bloquear os campos e navegação inferior acessível.

## Publicação web

O cookie atual é `SameSite=Strict`. Use HTTPS e app/API no mesmo site, por exemplo `app.seudominio.com` e `api.seudominio.com`, ou `/api` através de um proxy no mesmo domínio. Ter somente HTTPS em dois sites diferentes não basta para esse cookie. Configure `API_WEB_ORIGINS` com a origem exata do app e `EXPO_PUBLIC_API_URL` com o endereço público da API antes de gerar o bundle.

No domínio/VPS ou hospedagem escolhida, configure o servidor web para servir a exportação estática e encaminhar caminhos de aplicação não encontrados para `index.html`, permitindo abrir links como `/customers/UUID` diretamente. A API precisa continuar recebendo suas rotas próprias. Não há alteração de infraestrutura nesta entrega.

## Validação desta entrega

Em 17/11/2026: testes de autenticação e apresentação (19 casos), checagem TypeScript e exportação dos bundles web/Android/iOS. O navegador de prévia não conseguiu alcançar o servidor local neste ambiente; teste visual em aparelhos e operações reais com clientes permanecem no checklist manual. Exportar bundles não gera um APK/IPA nem substitui o teste em dispositivo.

## Logo, Minha conta e acesso às demais áreas

- O login e a barra lateral usam o arquivo original `assets/images/cost3d-logo.png`, copiado da logo espaçada marsala existente. A proporção original é preservada, sem redesenhar o robô.
- Minha conta mostra o e-mail e a troca de senha; o perfil de autorização deixou de aparecer na tela. As permissões da API não foram alteradas.
- A barra do celular reúne Início, Catálogo, Calcular, Vendas e Mais. Clientes, Movimentações e Minha conta ficam em Mais. A indicação “Site” identifica os fluxos que usam o navegador.
- Em Clientes, selecione uma pessoa para consultar seus orçamentos atuais e arquivados dentro do app. A lista usa `GET /api/v1/clientes/{id}/orcamentos`.
- O site tem sua própria sessão de login. O app não envia tokens na URL nem tenta converter o login da API em sessão do site. Se o navegador pedir, entre normalmente.
- O endereço do site usa o mesmo servidor de `EXPO_PUBLIC_API_URL` por padrão. Se necessário, configure `EXPO_PUBLIC_SITE_URL` no `.env.local` e reinicie o Expo. No celular, o endereço precisa estar acessível pela rede; localhost aponta para o próprio celular.

O Dashboard abre dentro do app e consulta /api/v1/dashboard para os períodos de 7 dias, 30 dias e todo o histórico.

O app consulta os cálculos recentes e alertas em /api/v1/inicio, as quatro categorias em /api/v1/catalogo e os lotes em /api/v1/vendas. Execute o backend atualizado para testar essas telas.

Teste a logo no celular e no desktop, confirme a ausência do perfil em Minha conta e abra os orçamentos de um cliente de teste. Confira as abas de atuais e arquivados e selecione outro cliente para verificar o filtro.
