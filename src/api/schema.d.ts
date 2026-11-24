/** Generated from OpenAPI by npm run api:generate. Do not edit. */
export interface components {
  schemas: {
    ConfiguracaoRequest: {
      markupPercentual?: number;
      markupFixo?: boolean;
      markupOpcao1: number;
      markupOpcao2: number;
      markupOpcao3: number;
      tarifaEnergiaKwh: number;
      embalagemFixa: boolean;
      custoEmbalagemFixa?: number;
      formularioAvancado?: boolean;
      maoObraAtivada?: boolean;
      valorMaoObraHora?: number;
      maoObraTempoFixo?: boolean;
      tempoMaoObraFixoMinutos?: number;
      depreciacaoAtivada?: boolean;
      taxaFalhaAtivada?: boolean;
      percentualFalha?: number;
      purgaGramasPorImpressao?: number;
      percentualFalhaValido?: boolean;
      tempoMaoObraFixoValido?: boolean;
      maoObraValida?: boolean;
      markupFixoValido?: boolean;
    };
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
    PecaRequest: {
      nome: string;
      categoria: string;
      quantidadeFilamentoGramas: number;
      tempoImpressaoMinutos: number;
      dadosArquivo3mf?: string;
    };
    ImpressoraRequest: {
      nome: string;
      modelo?: string;
      potenciaWatts?: number;
      valorCompra?: number;
      vidaUtilHoras?: number;
      depreciacaoPorHora?: number;
      depreciacaoOrigem?: string;
      anunciosNovos?: number;
      anunciosUsados?: number;
      depreciacaoManual?: boolean;
      horasMensaisUso?: number;
      horasMensaisManual?: boolean;
      tempoAquecimentoMinutos?: number;
    };
    FilamentoDadosRequest: {
      nome: string;
      cor: string;
      codigoCor: string;
      marca?: string;
      pesoRoloGramas: number;
      estoqueGramas?: number;
      precoRolo: number;
    };
    EmbalagemDadosRequest: { nome: string; custoUnitario: number };
    RegistroVenda: {
      unidades?: number;
      preco?: number;
      desconto?: number;
      taxas?: number;
      chave: string;
    };
    RegistroPerda: {
      filamentoId: string;
      unidades?: number;
      gramas: number;
      minutos?: number;
      observacao?: string;
      chave: string;
    };
    RegistroCusto: { descricao: string; valor: number; chave: string };
    Localizacao: { latitude: number; longitude: number };
    Modelo3mfFilamentoResponse: {
      id?: number;
      material?: string;
      cor?: string;
      pesoGramas?: number;
    };
    Modelo3mfPlacaResponse: {
      numero?: number;
      imagemPreviewDataUri?: string;
      tempoSegundos?: number;
      pesoGramas?: number;
      filamentos?: Array<components["schemas"]["Modelo3mfFilamentoResponse"]>;
      quantidadePecas?: number;
    };
    Modelo3mfResponse: {
      nome?: string;
      modeloImpressora?: string;
      material?: string;
      corMaterial?: string;
      alturaCamada?: string;
      diametroBico?: string;
      perfil?: string;
      fatiador?: string;
      jaFatiado?: boolean;
      temEstatisticas?: boolean;
      estatisticasCompletas?: boolean;
      numeroPlacasComEstatisticas?: number;
      tempoTotalSegundos?: number;
      pesoTotalGramas?: number;
      filamentosUsados?: Array<
        components["schemas"]["Modelo3mfFilamentoResponse"]
      >;
      numeroPlacas?: number;
      placas?: Array<components["schemas"]["Modelo3mfPlacaResponse"]>;
    };
    PecaModeloImportacaoRequest: {
      nomeArquivo?: string;
      dados?: components["schemas"]["Modelo3mfResponse"];
    };
    CompraCatalogo: {
      chave: string;
      compra: components["schemas"]["CompraFilamentoRequest"];
    };
    CompraFilamentoRequest: {
      unidadesCompra: number;
      gramasCompradas?: number;
      pesoRoloGramas: number;
      precoRolo: number;
      quantidadeTotalGramas?: number;
    };
    ConfirmacaoCalculo: {
      entrada: components["schemas"]["EntradaCalculo"];
      custoEsperado: number;
      precoEsperado: number;
      precoPlataformaEsperado?: number;
      foto?: string;
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
      venda?: components["schemas"]["VendaCalculoEntrada"];
      placas?: number;
      nomeConsulta?: string;
    };
    ItemCalculoRequest: {
      filamentoId: string;
      quantidadeFilamentoGramas: number;
    };
    VendaCalculoEntrada: {
      plataformaVenda?:
        "NENHUMA" | "SHOPEE" | "TIKTOK" | "MERCADO_LIVRE" | "AMAZON";
      tipoAnuncio?: string;
      percentualComissaoPlataforma?: number;
      custoAdicionalPlataforma?: number;
      percentualImposto?: number;
      freteVendedor?: number;
      percentualAfiliado?: number;
      tipoPessoaShopee?: string;
      mais450PedidosShopee?: boolean;
      freteGratisTikTok?: boolean;
      isencaoComissaoTikTok?: boolean;
      faixaPesoPacote?: string;
      freteMercadoLivreManual?: number;
    };
    CustosCalculo: {
      custoFilamento?: number;
      custoEnergia?: number;
      custoDepreciacao?: number;
      custoManutencao?: number;
      custoEmbalagem?: number;
      custoMaoObra?: number;
      custoFalha?: number;
      custoPurga?: number;
      custoLoja?: number;
      taxasPlataforma?: number;
      precoVendaPlataforma?: number;
      lucroLiquido?: number;
    };
    FilamentoResultado: {
      nome?: string;
      cor?: string;
      codigoCor?: string;
      gramas?: number;
      custo?: number;
    };
    ValorCalculo: {
      id?: string;
      nome?: string;
      custoUnitario?: number;
      precoUnitario?: number;
      unidades?: number;
      custos?: components["schemas"]["CustosCalculo"];
      plataforma?: string;
      comissao?: number;
      markup?: number;
      filamentos?: Array<components["schemas"]["FilamentoResultado"]>;
    };
    ArquivoConsulta: {
      nome?: string;
      placas?: number;
      segundos?: number;
      gramas?: number;
      materiais?: Array<components["schemas"]["Modelo3mfFilamentoResponse"]>;
      completo?: boolean;
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
      reservadas?: number;
      plataforma?: string;
      preco?: string;
    };
    PaginaResponseLoteResumo: {
      itens?: Array<components["schemas"]["LoteResumo"]>;
      pagina?: number;
      tamanho?: number;
      total?: number;
    };
    CustoLote: { descricao?: string; valor?: number; cancelado?: boolean };
    DetalheLote: {
      nome?: string;
      impressora?: string;
      produzido?: boolean;
      unidades?: number;
      vendidas?: number;
      reservadas?: number;
      disponiveis?: number;
      custoUnitario?: number;
      custoLote?: number;
      preco?: number;
      lucroPrevisto?: number;
      lucroVendas?: number;
      totalExtras?: number;
      materiais?: Array<components["schemas"]["Material"]>;
      incluidos?: Array<components["schemas"]["CustoLote"]>;
      personalizados?: Array<components["schemas"]["CustoLote"]>;
      vendas?: Array<components["schemas"]["VendaLote"]>;
    };
    Material: {
      nome?: string;
      gramas?: number;
      saldo?: number;
      cor?: string;
      codigoCor?: string;
      custo?: number;
      falta?: number;
      corSegura?: string;
      insuficiente?: boolean;
    };
    VendaLote: {
      data?: string;
      unidades?: number;
      canceladas?: number;
      preco?: number;
      lucro?: number;
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
    FotoCatalogo: { tipo?: string; base64?: string };
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
    TarifaEnergiaReferenciaResponse: {
      distribuidora?: string;
      valorKwh?: number;
      inicioVigencia?: string;
      fimVigencia?: string;
      unidade?: string;
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
      custoEmbalagemFixa?: number;
      markupFixo?: boolean;
      markup?: number;
      avancado?: boolean;
      atalhosMarkup?: Array<number>;
      maoObraAtivada?: boolean;
      maoObraTempoFixo?: boolean;
      tempoMaoObraFixoMinutos?: number;
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
