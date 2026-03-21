import { Request, Response, NextFunction } from 'express';
import { getMenuBySlug } from '../services/menu.service';

export async function getMenu(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { slug } = req.params;
    const menu = await getMenuBySlug(slug);
    res.json({ data: menu });
  } catch (err) {
    next(err);
  }
}
