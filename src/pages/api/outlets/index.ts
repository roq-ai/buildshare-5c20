import type { NextApiRequest, NextApiResponse } from 'next';
import { roqClient } from 'server/roq';
import { prisma } from 'server/db';
import { authorizationValidationMiddleware, errorHandlerMiddleware } from 'server/middlewares';
import { outletValidationSchema } from 'validationSchema/outlets';
import { convertQueryToPrismaUtil } from 'server/utils';
import { getServerSession } from '@roq/nextjs';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { roqUserId, user } = await getServerSession(req);
  switch (req.method) {
    case 'GET':
      return getOutlets();
    case 'POST':
      return createOutlet();
    default:
      return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  async function getOutlets() {
    const data = await prisma.outlet
      .withAuthorization({
        roqUserId,
        tenantId: user.tenantId,
        roles: user.roles,
      })
      .findMany(convertQueryToPrismaUtil(req.query, 'outlet'));
    return res.status(200).json(data);
  }

  async function createOutlet() {
    await outletValidationSchema.validate(req.body);
    const body = { ...req.body };
    if (body?.rental?.length > 0) {
      const create_rental = body.rental;
      body.rental = {
        create: create_rental,
      };
    } else {
      delete body.rental;
    }
    const data = await prisma.outlet.create({
      data: body,
    });
    return res.status(200).json(data);
  }
}

export default function apiHandler(req: NextApiRequest, res: NextApiResponse) {
  return errorHandlerMiddleware(authorizationValidationMiddleware(handler))(req, res);
}