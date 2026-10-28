import { ValueTransformer } from 'typeorm';

/**
 * PostgreSQL renvoie les colonnes DECIMAL sous forme de string.
 * Ce transformer les convertit en number (les montants sont des Ariary entiers).
 */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | number | null) =>
    value === null || value === undefined ? value : Number(value),
};