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
    Tema: {
      id?: string;
      nome?: string;
      corPrimaria?: string;
      corDestaque?: string;
      corFundo?: string;
      versao?: number;
      logoUrl?: string;
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
      pecasVendidas?: string;
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
    Conta: {
      id?: string;
      tenantId?: string;
      email?: string;
      perfil?: string;
      trocaSenhaObrigatoria?: boolean;
    };
  };
}
