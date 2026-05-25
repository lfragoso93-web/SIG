import axios, { AxiosInstance } from 'axios'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface RadarBond {
  /** Nome canônico do título, ex: "Tesouro Selic 2029" */
  name:                    string
  /** Indexador: "Selic" | "IPCA" | "Prefixado" */
  indexer:                 string
  /** Taxa vigente (% a.a.) */
  rate:                    number
  /** Data de vencimento ISO-8601 */
  maturityDate:            string
  /** Valor unitário de resgate (PU Venda) */
  unitaryRedemptionValue:  number
  /** Valor unitário de investimento (PU Compra) */
  unitaryInvestmentValue:  number
}

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
   * Retorna a lista de todos os títulos disponíveis no Tesouro Direto.
   */
  async listBonds(): Promise<RadarBond[]> {
    try {
      const response = await this.http.get<RadarBond[]>('/bonds.json')
      return response.data
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
