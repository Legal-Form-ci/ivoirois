import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, Clock, Send, Trash2, Edit2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import RichTextEditor from './RichTextEditor';

interface ScheduledMessage {
  id: string;
  content: string;
  scheduled_at: string;
  status: string;
  conversation_id: string;
  created_at: string;
}

interface ScheduledMessagingProps {
  conversationId: string;
  onMessageScheduled?: () => void;
}

const ScheduledMessaging = ({ conversationId, onMessageScheduled }: ScheduledMessagingProps) => {
  const { user } = useAuth();
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduler, setShowScheduler] = useState(false);
  const [content, setContent] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState('12:00');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (user && conversationId) {
      fetchScheduledMessages();
    }
  }, [user, conversationId]);

  const fetchScheduledMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('sender_id', user!.id)
        .eq('status', 'pending')
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setScheduledMessages(data || []);
    } catch (error) {
      console.error('Error fetching scheduled messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleMessage = async () => {
    if (!content.trim() || !scheduledDate || !user) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const [hours, minutes] = scheduledTime.split(':');
    const scheduledAt = new Date(scheduledDate);
    scheduledAt.setHours(parseInt(hours), parseInt(minutes));

    if (scheduledAt <= new Date()) {
      toast.error('La date doit être dans le futur');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('scheduled_messages')
          .update({
            content,
            scheduled_at: scheduledAt.toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Message modifié');
      } else {
        const { error } = await supabase
          .from('scheduled_messages')
          .insert({
            sender_id: user.id,
            conversation_id: conversationId,
            content,
            scheduled_at: scheduledAt.toISOString(),
            status: 'pending'
          });

        if (error) throw error;
        toast.success('Message programmé');
      }

      setContent('');
      setScheduledDate(undefined);
      setEditingId(null);
      setShowScheduler(false);
      fetchScheduledMessages();
      onMessageScheduled?.();
    } catch (error) {
      console.error('Error scheduling message:', error);
      toast.error('Erreur lors de la programmation');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Message supprimé');
      fetchScheduledMessages();
    } catch (error) {
      console.error('Error deleting scheduled message:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleEdit = (msg: ScheduledMessage) => {
    setContent(msg.content);
    setScheduledDate(new Date(msg.scheduled_at));
    setScheduledTime(format(new Date(msg.scheduled_at), 'HH:mm'));
    setEditingId(msg.id);
    setShowScheduler(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'sent': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div>
      <Dialog open={showScheduler} onOpenChange={setShowScheduler}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Programmer</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              {editingId ? 'Modifier le message programmé' : 'Programmer un message'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Écrivez votre message..."
              minHeight="100px"
            />

            <div className="flex gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {scheduledDate 
                      ? format(scheduledDate, 'PPP', { locale: fr })
                      : 'Choisir une date'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
              
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-28"
              />
            </div>

            <Button onClick={handleScheduleMessage} className="w-full">
              <Send className="w-4 h-4 mr-2" />
              {editingId ? 'Modifier' : 'Programmer'}
            </Button>
          </div>

          {scheduledMessages.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Messages programmés ({scheduledMessages.length})
              </h4>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {scheduledMessages.map((msg) => (
                    <Card key={msg.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div 
                            className="text-sm line-clamp-2"
                            dangerouslySetInnerHTML={{ 
                              __html: msg.content.replace(/<[^>]*>/g, '').slice(0, 80) + '...' 
                            }}
                          />
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {format(new Date(msg.scheduled_at), 'PPp', { locale: fr })}
                            </Badge>
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(msg.status)}`} />
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEdit(msg)}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleDelete(msg.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScheduledMessaging;
