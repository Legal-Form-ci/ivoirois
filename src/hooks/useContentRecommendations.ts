import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface RecommendedContent {
  id: string;
  type: 'post' | 'user' | 'group' | 'page' | 'job';
  score: number;
  reason: string;
  data: any;
}

export const useContentRecommendations = () => {
  const { user, profile } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendedContent[]>([]);
  const [loading, setLoading] = useState(true);

  // Track user interactions for better recommendations
  const trackInteraction = useCallback(async (
    contentType: string,
    contentId: string,
    interactionType: 'view' | 'like' | 'comment' | 'share' | 'click',
    weight: number = 1.0
  ) => {
    if (!user) return;

    try {
      await supabase.from('user_interactions').insert({
        user_id: user.id,
        content_type: contentType,
        content_id: contentId,
        interaction_type: interactionType,
        weight
      });
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  }, [user]);

  // Generate recommendations based on user profile and interactions
  const generateRecommendations = useCallback(async () => {
    if (!user || !profile) return;

    setLoading(true);

    try {
      const recommendations: RecommendedContent[] = [];

      // 1. Get posts from same region (priority)
      if (profile.region) {
        const { data: regionalPosts } = await supabase
          .from('posts')
          .select(`
            *,
            profiles:user_id (full_name, avatar_url, region)
          `)
          .neq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        const filteredRegional = regionalPosts?.filter(
          post => post.profiles?.region === profile.region
        ) || [];

        filteredRegional.forEach(post => {
          recommendations.push({
            id: post.id,
            type: 'post',
            score: 0.8,
            reason: 'De votre région',
            data: post
          });
        });
      }

      // 2. Get posts from users with similar interests
      if (profile.interests?.length) {
        const { data: interestPosts } = await supabase
          .from('posts')
          .select(`
            *,
            profiles:user_id (full_name, avatar_url, interests)
          `)
          .neq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        interestPosts?.forEach(post => {
          const authorInterests = post.profiles?.interests || [];
          const commonInterests = profile.interests?.filter(
            i => authorInterests.includes(i)
          ) || [];

          if (commonInterests.length > 0) {
            recommendations.push({
              id: post.id,
              type: 'post',
              score: 0.6 + (commonInterests.length * 0.1),
              reason: `Intérêts communs: ${commonInterests.slice(0, 2).join(', ')}`,
              data: post
            });
          }
        });
      }

      // 3. Get posts from same profession/sector
      if (profile.sector) {
        const { data: sectorPosts } = await supabase
          .from('posts')
          .select(`
            *,
            profiles:user_id (full_name, avatar_url, sector, profession)
          `)
          .neq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        sectorPosts?.filter(
          post => post.profiles?.sector === profile.sector
        ).forEach(post => {
          recommendations.push({
            id: post.id,
            type: 'post',
            score: 0.7,
            reason: `Même secteur: ${profile.sector}`,
            data: post
          });
        });
      }

      // 4. Suggest users to follow
      const { data: suggestedUsers } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .limit(20);

      suggestedUsers?.forEach(suggestedUser => {
        let score = 0.3;
        const reasons: string[] = [];

        if (suggestedUser.region === profile.region) {
          score += 0.2;
          reasons.push('Même région');
        }

        if (suggestedUser.sector === profile.sector) {
          score += 0.2;
          reasons.push('Même secteur');
        }

        const commonInterests = (profile.interests || []).filter(
          i => (suggestedUser.interests || []).includes(i)
        );
        if (commonInterests.length > 0) {
          score += commonInterests.length * 0.1;
          reasons.push(`${commonInterests.length} intérêts communs`);
        }

        if (score > 0.4) {
          recommendations.push({
            id: suggestedUser.id,
            type: 'user',
            score,
            reason: reasons.join(', ') || 'Suggestion pour vous',
            data: suggestedUser
          });
        }
      });

      // 5. Suggest jobs matching profile
      if (profile.sector || profile.profession) {
        const { data: jobs } = await supabase
          .from('job_posts')
          .select(`
            *,
            companies:company_id (name, logo_url)
          `)
          .eq('status', 'active')
          .limit(10);

        jobs?.forEach(job => {
          let score = 0.4;
          const reasons: string[] = [];

          if (job.location?.includes(profile.location || '')) {
            score += 0.2;
            reasons.push('Près de chez vous');
          }

          if (job.experience_level === profile.experience_level) {
            score += 0.2;
            reasons.push('Niveau correspondant');
          }

          recommendations.push({
            id: job.id,
            type: 'job',
            score,
            reason: reasons.join(', ') || 'Offre d\'emploi',
            data: job
          });
        });
      }

      // 6. Suggest groups based on interests
      const { data: groups } = await supabase
        .from('groups')
        .select('*')
        .limit(10);

      groups?.forEach(group => {
        recommendations.push({
          id: group.id,
          type: 'group',
          score: 0.5,
          reason: 'Groupe recommandé',
          data: group
        });
      });

      // Sort by score and deduplicate
      const uniqueRecommendations = recommendations
        .filter((rec, index, self) => 
          self.findIndex(r => r.id === rec.id && r.type === rec.type) === index
        )
        .sort((a, b) => b.score - a.score);

      setRecommendations(uniqueRecommendations);
    } catch (error) {
      console.error('Error generating recommendations:', error);
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    if (user && profile) {
      generateRecommendations();
    }
  }, [user, profile, generateRecommendations]);

  return {
    recommendations,
    loading,
    trackInteraction,
    refreshRecommendations: generateRecommendations
  };
};
