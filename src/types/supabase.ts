export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            categorias_insumos: {
                Row: {
                    id: string
                    nome: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    nome: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    nome?: string
                    created_at?: string
                }
            }
            categorias_sinteticas: {
                Row: {
                    id: string
                    nome: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    nome: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    nome?: string
                    created_at?: string
                }
            }
            unidades_medida: {
                Row: {
                    id: string
                    sigla: string
                    nome: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    sigla: string
                    nome: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    sigla?: string
                    nome?: string
                    created_at?: string
                }
            }
            setores_responsaveis: {
                Row: {
                    id: string
                    nome: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    nome: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    nome?: string
                    created_at?: string
                }
            }
            especialidades: {
                Row: {
                    id: string
                    nome: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    nome: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    nome?: string
                    created_at?: string
                }
            }
            dificuldades: {
                Row: {
                    id: string
                    nome: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    nome: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    nome?: string
                    created_at?: string
                }
            }
            insumos: {
                Row: {
                    id: string
                    nome_padronizado: string
                    descricao_produto: string
                    categoria_id: string | null
                    categoria_sintetica_id: string | null
                    fornecedor: string | null
                    custo_compra: number
                    quantidade_compra: number
                    unidade_compra_id: string
                    peso_unidade: number
                    unidade_peso_id: string
                    fator_correcao: number
                    data_cadastro: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    nome_padronizado: string
                    descricao_produto: string
                    categoria_id: string | null
                    categoria_sintetica_id: string | null
                    fornecedor?: string | null
                    custo_compra: number
                    quantidade_compra: number
                    unidade_compra_id: string
                    peso_unidade: number
                    unidade_peso_id: string
                    fator_correcao?: number
                    data_cadastro?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    nome_padronizado?: string
                    descricao_produto?: string
                    categoria_id: string | null
                    categoria_sintetica_id: string | null
                    fornecedor?: string | null
                    custo_compra?: number
                    quantidade_compra?: number
                    unidade_compra_id?: string
                    peso_unidade?: number
                    unidade_peso_id?: string
                    fator_correcao?: number
                    data_cadastro?: string
                    updated_at?: string
                }
            }
            fichas_tecnicas: {
                Row: {
                    id: string
                    nome_receita: string
                    codigo_id: string | null
                    tipo_produto: 'Base' | 'Final'
                    setor_responsavel_id: string | null
                    especialidade_id: string | null
                    dificuldade_id: string | null
                    tempo_preparo: string | null
                    rendimento_kg: number
                    custo_total_estimado: number | null
                    cmv_estimado: number | null
                    cmv_produto_valor: number | null
                    cmv_produto_percent: number | null
                    preco_venda: number | null
                    e_insumo: boolean
                    observacoes: string | null
                    data_criacao: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    nome_receita: string
                    codigo_id?: string | null
                    tipo_produto: 'Base' | 'Final'
                    setor_responsavel_id?: string | null
                    especialidade_id?: string | null
                    dificuldade_id?: string | null
                    tempo_preparo?: string | null
                    rendimento_kg?: number
                    custo_total_estimado?: number | null
                    cmv_estimado?: number | null
                    cmv_produto_valor?: number | null
                    cmv_produto_percent?: number | null
                    preco_venda?: number | null
                    e_insumo?: boolean
                    observacoes?: string | null
                    data_criacao?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    nome_receita?: string
                    codigo_id?: string | null
                    tipo_produto?: 'Base' | 'Final'
                    setor_responsavel_id?: string | null
                    especialidade_id?: string | null
                    dificuldade_id?: string | null
                    tempo_preparo?: string | null
                    rendimento_kg?: number
                    custo_total_estimado?: number | null
                    cmv_estimado?: number | null
                    cmv_produto_valor?: number | null
                    cmv_produto_percent?: number | null
                    preco_venda?: number | null
                    e_insumo?: boolean
                    observacoes?: string | null
                    data_criacao?: string
                    updated_at?: string
                }
            }
            ft_ingredientes: {
                Row: {
                    id: string
                    ft_id: string
                    insumo_id: string
                    quantidade_utilizada: number
                    unidade_utilizada_id: string
                    dica_uso: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    ft_id: string
                    insumo_id: string
                    quantidade_utilizada: number
                    unidade_utilizada_id: string
                    dica_uso?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    ft_id?: string
                    insumo_id?: string
                    quantidade_utilizada?: number
                    unidade_utilizada_id?: string
                    dica_uso?: string | null
                    created_at?: string
                }
            },
            configuracoes_negocio: {
                Row: {
                    id: string
                    despesas_fixas_total: number
                    despesas_variaveis: Json
                    usar_margem_por_especialidade: boolean
                    margem_padrao: number
                    margens_especialidades: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    despesas_fixas_total?: number
                    despesas_variaveis?: Json
                    usar_margem_por_especialidade?: boolean
                    margem_padrao?: number
                    margens_especialidades?: Json
                    created_at?: string
                }
                Update: {
                    id?: string
                    despesas_fixas_total?: number
                    despesas_variaveis?: Json
                    usar_margem_por_especialidade?: boolean
                    margem_padrao?: number
                    margens_especialidades?: Json
                    created_at?: string
                }
            }
        }
    }
}
