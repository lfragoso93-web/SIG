import type { FastifyRequest, FastifyReply } from 'fastify'
import { createFixedIncomeSchema, redeemFixedIncomeSchema } from './fixed-income.schema'
import * as service from './fixed-income.service'

export async function createFixedIncomeHandler(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const dto = createFixedIncomeSchema.parse(req.body)
  const result = await service.createFixedIncome(dto)
  return reply.status(201).send(result)
}

export async function listFixedIncomeHandler(
  _req: FastifyRequest,
  reply: FastifyReply,
) {
  const result = await service.listFixedIncome()
  return reply.send(result)
}

export async function getFixedIncomeHandler(
  req: FastifyRequest<{ Params: { assetId: string } }>,
  reply: FastifyReply,
) {
  const result = await service.getFixedIncome(req.params.assetId)
  return reply.send(result)
}

export async function redeemFixedIncomeHandler(
  req: FastifyRequest<{ Params: { assetId: string } }>,
  reply: FastifyReply,
) {
  const dto    = redeemFixedIncomeSchema.parse(req.body)
  const result = await service.redeemFixedIncome(req.params.assetId, dto)
  return reply.send(result)
}
