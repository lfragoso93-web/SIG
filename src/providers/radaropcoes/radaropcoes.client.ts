import axios, { AxiosInstance } from 'axios'

// ---------------------------------------------------------------------------
// Tipos — alinhados com o schema real de https://api.radaropcoes.com
// ---------------------------------------------------------------------------

/**
 * Resposta de GET /bonds/{treasury_bond_name}
 * Campos confirmados via openapi.json + chamada real à API.
 */
export interface RadarBond {
  /** Nome canônico do título, ex: "Tesouro Selic 2029" */
  treasuryBondName:                    string | null
  /** Código interno do título */
  treasuryBondCode:                    number | null
  /** Indexador da rentabilidade na compra, ex: "IPCA", "SELIC" */
  investmentProfitabilityIndexerName:  string | null
  /** Rentabilidade de resgate, ex: "IPCA + 7,78%" */
  redemptionProfitabilityFeeIndexerName: string | null
  /** Valor unitário de resgate (PU Venda) */
  unitaryRedemptionValue:              number | null
  /** Valor unitário de investimento (PU Compra) */
  unitaryInvestmentValue:              number | null
  /** Data de vencimento ISO-8601, ex: "2035-05-15T00:00:00" */
  maturityDate:                        string | null
  /** Tipo de recebimento de juros: "U" = único no vencimento, "S" = semestral */
  typeReceiptInterest:                 string | null
  /** Código do segmento */
  segmentCode:                         number | null
  /** Indicação/descrição do título */
  indication:                          string | null
  /** Valor mínimo de investimento */
  investmentBondMinimumValue:          number | null
  /** Última atualização ISO-8601 */
  updated_at:                          string
  /** "resgatar" | "investir" */
  type:                                string
}

// ---------------------------------------------------------------------------
// Estrutura interna do GET /bonds.json
// ---------------------------------------------------------------------------

interface BondsJsonTrsrBd {
  nm:             string
  untrRedVal:     string | number
  untrInvstmtVal: string | number
  updated_at:     string
  type:           string
}

interface BondsJsonItem {
  TrsrBd: BondsJsonTrsrBd
}

interface BondsJsonResponse {
  response: {
    TrsrBdTradgList: BondsJsonItem[]
  }
  updated_at: string
}

// ---------------------------------------------------------------------------
// Erros
// ---------------------------------------------------------------------------

export class RadarOpcoesHttpError extends Error {
  public readonly status?:  number
  public readonly details?: unknown

  constructor(message: string, status?: number, details?: unknown) {
    super(message)
    this.name    = 'RadarOpcoesHttpError'
    this.status  = status
    this.details = details
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

class RadarOpcoesClient {
  private readonly http: AxiosInstance

  constructor() {
    this.http = axios.create({
      baseURL: 'https://api.radaropcoes.com',
      timeout: 15_000,
      headers: { 'Accept': 'application/json' },
    })
  }

  /**
   * Retorna os dados atuais de um título específico.
   * Endpoint: GET /bonds/{treasury_bond_name}
   *
   * @param bondName Nome exato do título, ex: "Tesouro Selic 2029"
   */
  async getBond(bondName: string): Promise<RadarBond> {
    try {
      const response = await this.http.get<RadarBond>(
        `/bonds/${encodeURIComponent(bondName)}`,
      )
      return response.data
    } catch (error: unknown) {
      const e = error as { message?: string; response?: { status?: number; data?: unknown } }
      throw new RadarOpcoesHttpError(
        `Erro ao buscar título "${bondName}": ${e?.message}`,
        e?.response?.status,
        e?.response?.data,
      )
    }
  }

  /**
   * Retorna a lista resumida de todos os títulos disponíveis no Tesouro Direto.
   * Endpoint: GET /bonds.json
   *
   * Nota: este endpoint retorna apenas nome, PU e última atualização.
   * Para dados completos (indexador, vencimento etc.), use getBond().
   */
  async listBonds(): Promise<Array<{ name: string; unitaryRedemptionValue: number | null; unitaryInvestmentValue: number | null; updatedAt: string }>> {
    try {
      const response = await this.http.get<BondsJsonResponse>('/bonds.json')
      const list = response.data?.response?.TrsrBdTradgList ?? []

      return list.map((item) => {
        const b = item.TrsrBd
        const toNumber = (v: string | number | null | undefined): number | null => {
          if (v == null) return null
          const n = Number(v)
          return isNaN(n) ? null : n
        }
        return {
          name:                    b.nm,
          unitaryRedemptionValue:  toNumber(b.untrRedVal),
          unitaryInvestmentValue:  toNumber(b.untrInvstmtVal),
          updatedAt:               b.updated_at,
        }
      })
    } catch (error: unknown) {
      const e = error as { message?: string; response?: { status?: number; data?: unknown } }
      throw new RadarOpcoesHttpError(
        `Erro ao listar títulos: ${e?.message}`,
        e?.response?.status,
        e?.response?.data,
      )
    }
  }
}

export const radarOpcoesClient = new RadarOpcoesClient()
