/** Generated from OpenAPI by npm run api:generate. Do not edit. */
export interface components {
  schemas: {
    Entrada: {
      nome: string;
      telefone?: string;
      email?: string;
      observacoes?: string;
      versao?: number;
    };
    Cliente: {
      id?: string;
      versao?: number;
      nome?: string;
      telefone?: string;
      email?: string;
      observacoes?: string;
      arquivado?: boolean;
    };
    ConfirmacaoCalculo: {
      entrada: components["schemas"]["EntradaCalculo"];
      custoEsperado: number;
      precoEsperado: number;
    };
    EntradaCalculo: {
      pecaId?: string;
      impressoraId: string;
      filamentos: Array<components["schemas"]["ItemCalculoRequest"]>;
      embalagemId?: string;
      unidades?: number;
      minutos?: number;
      trabalho?: number;
      markup?: number;
    };
    ItemCalculoRequest: {
      filamentoId: string;
      quantidadeFilamentoGramas: number;
    };
    ValorCalculo: {
      id?: string;
      nome?: string;
      custoUnitario?: number;
      precoUnitario?: number;
      unidades?: number;
    };
    SessaoWeb: { accessToken?: string; tokenType?: string; expiresIn?: number };
    Login: { email: string; senha: string };
    AlterarSenhaRequest: {
      senhaAtual: string;
      novaSenha: string;
      confirmarNovaSenha: string;
    };
    Renovar: { refreshToken: string };
    Tokens: {
      accessToken?: string;
      refreshToken?: string;
      tokenType?: string;
      expiresIn?: number;
      refreshExpiraEm?: string;
    };
    Arquivo: { arquivado: boolean };
    LoteResumo: {
      id?: string;
      nome?: string;
      unidades?: number;
      vendidas?: number;
      disponiveis?: number;
      preco?: string;
    };
    PaginaResponseLoteResumo: {
      itens?: Array<components["schemas"]["LoteResumo"]>;
      pagina?: number;
      tamanho?: number;
      total?: number;
    };
    Tema: {
      id?: string;
      nome?: string;
      corPrimaria?: string;
      corDestaque?: string;
      corFundo?: string;
      versao?: number;
      logoUrl?: string;
    };
    FilamentoCatalogo: {
      id?: string;
      nome?: string;
      cor?: string;
      estoque?: string;
      codigoCor?: string;
      pesoRolo?: string;
      marca?: string;
      precoRolo?: string;
    };
    InicioLoja: {
      recentes?: Array<components["schemas"]["Recente"]>;
      aguardandoVenda?: number;
      estoqueCritico?: components["schemas"]["FilamentoCatalogo"];
      valorHoraConfigurado?: boolean;
    };
    Recente: {
      id?: string;
      nome?: string;
      situacao?: string;
      custoUnitario?: string;
      precoSugerido?: string;
      unidades?: number;
    };
    Abertura: { registros?: number; gramas?: string };
    Extrato: {
      movimentacoes?: components["schemas"]["PaginaResponseMovimentacaoResponse"];
      resumo?: Array<components["schemas"]["Resumo"]>;
      abertura?: components["schemas"]["Abertura"];
      pecasVendidas?: string;
    };
    MovimentacaoResponse: {
      id?: string;
      tipo?: string;
      descricao?: string;
      quantidade?: string;
      medida?: string;
      origem?: string;
      referencia?: string;
      filamentoId?: string;
      saldoApos?: string;
      data?: string;
    };
    PaginaResponseMovimentacaoResponse: {
      itens?: Array<components["schemas"]["MovimentacaoResponse"]>;
      pagina?: number;
      tamanho?: number;
      total?: number;
    };
    Resumo: {
      medida?: string;
      entrou?: string;
      saiu?: string;
      saldo?: string;
      pecasVendidas?: string;
    };
    CadastrosPainel: {
      pecas?: number;
      filamentos?: number;
      impressoras?: number;
      embalagens?: number;
      clientes?: number;
    };
    CustoPainel: { nome?: string; valor?: string; percentual?: number };
    DashboardLoja: {
      lucro?: string;
      vendas?: number;
      horas?: string;
      filamentoKg?: string;
      serie?: Array<components["schemas"]["PontoLucro"]>;
      plataformas?: Array<components["schemas"]["VendasPlataforma"]>;
      estoque?: Array<components["schemas"]["EstoquePainel"]>;
      calculadas?: number;
      produzidas?: number;
      vendidas?: number;
      custos?: Array<components["schemas"]["CustoPainel"]>;
      cadastros?: components["schemas"]["CadastrosPainel"];
      categorias?: Array<components["schemas"]["VendasCategoria"]>;
      lucroPlataformas?: string;
      variacaoLucro?: string;
    };
    EstoquePainel: {
      nome?: string;
      gramas?: string;
      restante?: number;
      cor?: string;
    };
    PontoLucro: { data?: string; valor?: string };
    VendasCategoria: { nome?: string; unidades?: number };
    VendasPlataforma: {
      nome?: string;
      vendas?: number;
      lucro?: string;
      cor?: string;
    };
    ClienteResumo: {
      cliente?: components["schemas"]["Cliente"];
      orcamentos?: number;
      emAndamento?: number;
      ultimoOrcamento?: string;
    };
    Contadores: {
      ativos?: number;
      arquivados?: number;
      comAndamento?: number;
      semOrcamento?: number;
    };
    Listagem: {
      clientes?: components["schemas"]["PaginaResponseClienteResumo"];
      resumo?: components["schemas"]["Contadores"];
    };
    PaginaResponseClienteResumo: {
      itens?: Array<components["schemas"]["ClienteResumo"]>;
      pagina?: number;
      tamanho?: number;
      total?: number;
    };
    OrcamentoResumo: {
      id?: string;
      codigo?: string;
      titulo?: string;
      situacao?: string;
      criadoEm?: string;
      total?: string;
    };
    PaginaResponseOrcamentoResumo: {
      itens?: Array<components["schemas"]["OrcamentoResumo"]>;
      pagina?: number;
      tamanho?: number;
      total?: number;
    };
    PaginaResponsePecaCatalogo: {
      itens?: Array<components["schemas"]["PecaCatalogo"]>;
      pagina?: number;
      tamanho?: number;
      total?: number;
    };
    PecaCatalogo: {
      id?: string;
      nome?: string;
      categoria?: string;
      gramas?: string;
      minutos?: number;
      preco?: string;
      placaMiniatura?: number;
      modeloImpressora?: string;
      materiais?: Array<components["schemas"]["PecaMaterialResumo"]>;
    };
    PecaMaterialResumo: {
      material?: string;
      corHex?: string;
      pesoGramas?: number;
    };
    FotoCatalogo: { tipo?: string; base64?: string };
    ArquivoCatalogo: {
      nomeArquivo?: string;
      modeloImpressora?: string;
      fatiador?: string;
      numeroPlacas?: number;
      placas?: Array<components["schemas"]["PlacaCatalogo"]>;
    };
    PlacaCatalogo: {
      numero?: number;
      temImagem?: boolean;
      tempoSegundos?: number;
      pesoGramas?: number;
      materiais?: Array<components["schemas"]["PecaMaterialResumo"]>;
    };
    ImpressoraCatalogo: {
      id?: string;
      nome?: string;
      modelo?: string;
      watts?: string;
      aquecimento?: number;
    };
    PaginaResponseImpressoraCatalogo: {
      itens?: Array<components["schemas"]["ImpressoraCatalogo"]>;
      pagina?: number;
      tamanho?: number;
      total?: number;
    };
    CustosImpressora: {
      depreciacaoHora?: string;
      vidaUtilHoras?: string;
      horasMensais?: string;
      minutosImpressos?: number;
      gastoTotal?: string;
      manutencaoHora?: string;
      registros?: Array<components["schemas"]["GastoCatalogo"]>;
    };
    GastoCatalogo: {
      id?: string;
      descricao?: string;
      data?: string;
      valor?: string;
    };
    PaginaResponseFilamentoCatalogo: {
      itens?: Array<components["schemas"]["FilamentoCatalogo"]>;
      pagina?: number;
      tamanho?: number;
      total?: number;
    };
    EmbalagemCatalogo: {
      id?: string;
      nome?: string;
      custo?: string;
      usos?: number;
    };
    PaginaResponseEmbalagemCatalogo: {
      itens?: Array<components["schemas"]["EmbalagemCatalogo"]>;
      pagina?: number;
      tamanho?: number;
      total?: number;
    };
    HistoricoListaResponse: {
      id?: string;
      nomePeca?: string;
      dataCalculo?: string;
      plataformaVenda?: string;
      precoVendaPlataforma?: number;
      precoSugerido?: number;
      produzido?: boolean;
      vendido?: boolean;
      temFoto?: boolean;
      unidades?: number;
      custoTotal?: number;
      lucroLiquido?: number;
      dataVenda?: string;
      unidadesVendidas?: number;
    };
    PaginaResponseHistoricoListaResponse: {
      itens?: Array<components["schemas"]["HistoricoListaResponse"]>;
      pagina?: number;
      tamanho?: number;
      total?: number;
    };
    CalculoSalvo: {
      valores?: components["schemas"]["ValorCalculo"];
      impressora?: string;
      filamento?: string;
      embalagem?: string;
      minutos?: number;
      situacao?: string;
      data?: string;
    };
    PadroesCalculo: {
      embalagemFixa?: boolean;
      markupFixo?: boolean;
      markup?: number;
    };
    Conta: {
      id?: string;
      tenantId?: string;
      email?: string;
      perfil?: string;
      trocaSenhaObrigatoria?: boolean;
    };
  };
}
