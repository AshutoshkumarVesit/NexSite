import type { IAgent } from '../../core/interfaces/IAgent';
import type { PipelineState } from '../../core/entities/PipelineState';
import type { ILLMProvider } from '../../core/interfaces/ILLMProvider';
import { DATA_MODEL_AGENT_PROMPT } from '../../prompts/data_model.prompt';

export class DataModelAgent implements IAgent {
  public name = 'DataModelAgent';
  public role = 'Data Architect';

  constructor(private llmProvider: ILLMProvider) {}

  public async execute(state: PipelineState): Promise<Partial<PipelineState>> {
    const timestamp = new Date().toISOString();
    console.log('[DataModelAgent] Generating unified data model...');

    try {
      const prompt = DATA_MODEL_AGENT_PROMPT
        .replace('{raw_prompt}', state.requirements.raw_prompt || state.requirements.category || 'Custom App')
        .replace('{requirements}', JSON.stringify(state.requirements, null, 2))
        .replace('{ui_spec}', JSON.stringify(state.ui_spec, null, 2))
        .replace('{content}', JSON.stringify(state.content, null, 2))
        .replace('{component_plan}', JSON.stringify(state.component_plan, null, 2));

      let dataModel: any;
      try {
        const rawResult = await this.llmProvider.generateJSON<any>(
          prompt,
          'A unified JSON object containing all the application data.'
        );
        dataModel = rawResult?.data_model || rawResult?.dataModel || rawResult?.data || rawResult;
      } catch (e) {
        console.warn('[DataModelAgent] LLM generation failed, building structured model from content...');
        const content = state.content || {};
        const theme = state.ui_spec?.theme || {};
        const rawCategory = (state.requirements.category || '').toLowerCase();
        
        // Category-tailored hero background
        let heroBg = 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=1080&fit=crop&auto=format&q=80';
        if (rawCategory.includes('restaurant') || rawCategory.includes('food')) {
          heroBg = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&h=1080&fit=crop&auto=format&q=80';
        } else if (rawCategory.includes('fitness') || rawCategory.includes('gym')) {
          heroBg = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&h=1080&fit=crop&auto=format&q=80';
        } else if (rawCategory.includes('saas') || rawCategory.includes('tech')) {
          heroBg = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&h=1080&fit=crop&auto=format&q=80';
        } else if (rawCategory.includes('portfolio') || rawCategory.includes('design')) {
          heroBg = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1920&h=1080&fit=crop&auto=format&q=80';
        } else if (rawCategory.includes('crypto') || rawCategory.includes('finance')) {
          heroBg = 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1920&h=1080&fit=crop&auto=format&q=80';
        } else if (rawCategory.includes('health') || rawCategory.includes('medical')) {
          heroBg = 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=1920&h=1080&fit=crop&auto=format&q=80';
        }

        dataModel = {
          designSystem: {
            primaryColor: theme.primaryColor || '#7c3aed',
            secondaryColor: theme.secondaryColor || '#6366f1',
            accentColor: theme.accentColor || '#ec4899',
            backgroundColor: theme.backgroundColor || '#0f172a',
            textColor: theme.textColor || '#f8fafc',
            fontHeading: theme.fontHeading || 'Inter',
            fontBody: theme.fontBody || 'Inter'
          },
          navbar: {
            title: state.requirements.category || 'NexSite',
            links: [
              { label: 'Home', href: '#hero' },
              { label: 'Features', href: '#features' },
              { label: 'About', href: '#about' },
              { label: 'Reviews', href: '#testimonials' },
              { label: 'Contact', href: '#footer' }
            ],
            cta: { text: 'Get Started', href: '#features' }
          },
          hero: {
            title: content.hero?.title || `Welcome to ${state.requirements.raw_prompt || state.requirements.category}`,
            subtitle: content.hero?.subtitle || 'Discover an elevated digital experience built with cutting-edge engineering and modern aesthetics.',
            primaryCta: { text: content.hero?.cta || 'Explore Features', href: '#features' },
            secondaryCta: { text: 'Learn More', href: '#about' },
            backgroundImage: heroBg
          },
          features: content.features || [
            { 
              title: 'Lightning Fast', 
              description: 'Engineered for near-zero latency, instant response times, and optimized render cycles.',
              icon: 'Zap',
              image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop'
            },
            { 
              title: 'Precision Craft', 
              description: 'Designed with meticulous attention to typography, micro-interactions, and visual balance.',
              icon: 'Sparkles',
              image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&h=600&fit=crop'
            },
            { 
              title: 'Built to Scale', 
              description: 'Modular architecture ready for enterprise workloads and seamless ecosystem integration.',
              icon: 'Shield',
              image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop'
            }
          ],
          about: content.about || {
            title: 'Our Mission & Story',
            body: 'Dedicated to delivering exceptional digital craftsmanship and empowering users across the globe with transformative experiences.',
            image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop'
          },
          testimonials: content.testimonials || [
            { 
              name: 'Sarah Chen', 
              role: 'Product Lead, Aurora', 
              quote: 'The level of detail and responsiveness exceeded all of our expectations. Truly a masterpiece.',
              avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop'
            },
            { 
              name: 'Marcus Vance', 
              role: 'Founder, Pulse Studio', 
              quote: 'An absolute game changer for our business. Visual design and performance are top tier.',
              avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop'
            }
          ],
          footer: content.footer || {
            copyright: `© ${new Date().getFullYear()} ${state.requirements.category || 'Platform'}. All rights reserved.`,
            links: [
              { label: 'Privacy Policy', href: '#' },
              { label: 'Terms of Service', href: '#' },
              { label: 'Support', href: '#' }
            ]
          }
        };
      }

      return {
        data_model: dataModel,
        project_metadata: {
          ...state.project_metadata,
          current_step: 'DataModelAgent Completed',
          status: 'running'
        },
        logs: [
          {
            timestamp,
            agentName: this.name,
            message: 'Successfully generated unified Data Model.',
            level: 'info'
          }
        ]
      };
    } catch (err: any) {
      console.error('[DataModelAgent] Error:', err);
      return {
        errors: [{
          agentName: this.name,
          error: `Failed to generate data model: ${err.message}`,
          timestamp
        }]
      };
    }
  }
}
