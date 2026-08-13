import type { ITemplateBlueprint } from './base/TemplateTypes';
import { SaaSTemplateBlueprint } from './saas/SaaSTemplate';
import { PortfolioTemplateBlueprint } from './portfolio/PortfolioTemplate';
import { RestaurantTemplateBlueprint } from './restaurant/RestaurantTemplate';
import { AgencyTemplateBlueprint } from './agency/AgencyTemplate';
import { HealthcareTemplateBlueprint } from './healthcare/HealthcareTemplate';
import { EcommerceTemplateBlueprint } from './e-commerce/EcommerceTemplate';
import { CryptoTemplateBlueprint } from './crypto/CryptoTemplate';

export class TemplateRegistry {
  private static templates: Map<string, ITemplateBlueprint> = new Map([
    ['Crypto', CryptoTemplateBlueprint],
    ['SaaS', SaaSTemplateBlueprint],
    ['Portfolio', PortfolioTemplateBlueprint],
    ['Restaurant', RestaurantTemplateBlueprint],
    ['Agency', AgencyTemplateBlueprint],
    ['Healthcare', HealthcareTemplateBlueprint],
    ['E-Commerce', EcommerceTemplateBlueprint],
    ['LandingPage', SaaSTemplateBlueprint],
    ['Corporate', AgencyTemplateBlueprint],
    ['Blog', PortfolioTemplateBlueprint]
  ]);

  public static getTemplate(category: string): ITemplateBlueprint {
    const normalized = (category || '').trim();
    return this.templates.get(normalized) || SaaSTemplateBlueprint;
  }
}
