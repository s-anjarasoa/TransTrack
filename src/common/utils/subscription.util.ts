/**
 * Une société est « active » si elle a un abonnement payé couvrant AUJOURD'HUI.
 * La règle est calculée à chaque requête (aucune tâche planifiée requise) :
 * elle reste donc juste même si un job nocturne n'a pas tourné.
 */

/**
 * Fragment SQL à ajouter dans un WHERE de QueryBuilder.
 * @param societeAlias alias de la table societes dans la requête (ex. 's')
 * @param graceDays    jours de tolérance après la date de fin (0 = aucune)
 */
export function activeSubscriptionSql(societeAlias: string, graceDays = 0): string {
  const grace = Math.max(0, Math.floor(graceDays));
  return (
    `EXISTS (SELECT 1 FROM abonnements ab ` +
    `WHERE ab."societeId" = ${societeAlias}.id ` +
    `AND ab."isActif" = true ` +
    `AND ab."dateDebut" <= CURRENT_DATE ` +
    `AND ab."dateFin" + ${grace} >= CURRENT_DATE)`
  );
}

/** Même règle pour une société donnée (DataSource ou EntityManager) */
export async function hasActiveSubscription(
  db: { query: (sql: string, params?: any[]) => Promise<any[]> },
  societeId: number,
  graceDays = 0,
): Promise<boolean> {
  const grace = Math.max(0, Math.floor(graceDays));
  const rows = await db.query(
    `SELECT 1 FROM abonnements ab ` +
      `WHERE ab."societeId" = $1 AND ab."isActif" = true ` +
      `AND ab."dateDebut" <= CURRENT_DATE ` +
      `AND ab."dateFin" + ${grace} >= CURRENT_DATE LIMIT 1`,
    [societeId],
  );
  return rows.length > 0;
}