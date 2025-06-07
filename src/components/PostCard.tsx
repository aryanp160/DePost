import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Eye, Reply, Trash2, Hash, AtSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import { getUserData } from '@/lib/userService';

interface Post {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  likes: number;
  views: number;
  cid: string;
  parentId?: string;
  tags?: string[];
  mentions?: string[];
  likedBy?: string[];
  viewedBy?: string[];
}

interface PostCardProps {
  post: Post;
  userEmail?: string;
  onReply: (postId: string, content: string) => void;
  onDelete: (postId: string) => void;
  onLike: (postId: string) => void;
  onView: (postId: string) => void;
  onUpdateCounts: (postId: string, likes: number, views: number, likedBy: string[], viewedBy: string[]) => void;
  isReply?: boolean;
  replyDepth?: number;
}

export const PostCard = ({ 
  post, 
  userEmail, 
  onReply, 
  onDelete, 
  onLike,
  onView,
  onUpdateCounts,
  isReply = false,
  replyDepth = 0
}: PostCardProps) => {
  const [likes, setLikes] = useState(post.likes);
  const [views, setViews] = useState(post.views);
  const [likedBy, setLikedBy] = useState<string[]>(post.likedBy || []);
  const [viewedBy, setViewedBy] = useState<string[]>(post.viewedBy || []);
  const [hasLiked, setHasLiked] = useState(post.likedBy?.includes(userEmail || '') || false);
  const [hasViewed, setHasViewed] = useState(post.viewedBy?.includes(userEmail || '') || false);
  const [isLiking, setIsLiking] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const getDisplayName = (email: string) => {
    const userId = email;
    const storedUsername = localStorage.getItem(`username_${userId}`);
    if (storedUsername) return storedUsername;
    return email.split('@')[0];
  };

  const handleProfileClick = (email: string) => {
    const encodedEmail = encodeURIComponent(email);
    navigate(`/profile/${encodedEmail}`);
  };

  React.useEffect(() => {
    if (!hasViewed && userEmail) {
      const timer = setTimeout(async () => {
        const newViewedBy = [...viewedBy, userEmail];
        const newViews = views + 1;
        setViews(newViews);
        setViewedBy(newViewedBy);
        setHasViewed(true);
        
        // Create a new IPFS file with updated counts
        await createMetadataFile(post.id, likedBy, newViewedBy);
        onUpdateCounts(post.id, likes, newViews, likedBy, newViewedBy);
        onView(post.id);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [hasViewed, post.id, onView, userEmail, likes, views, likedBy, viewedBy, onUpdateCounts]);

  const createMetadataFile = async (postId: string, newLikedBy: string[], newViewedBy: string[]) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userData = await getUserData(user);
      const apiKey = userData?.k;
      const secret = userData?.s;

      if (!apiKey || !secret) return;

      const metadataContent = {
        postId: postId,
        likes: newLikedBy.length,
        views: newViewedBy.length,
        likedBy: newLikedBy,
        viewedBy: newViewedBy,
        timestamp: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(metadataContent)], { type: 'application/json' });
      const formData = new FormData();
      formData.append('file', blob);

      const metadata = JSON.stringify({
        name: `depost-metadata-${postId}-${Date.now()}`,
        keyvalues: {
          type: 'metadata',
          postId: postId,
          likes: newLikedBy.length.toString(),
          views: newViewedBy.length.toString(),
          updatedAt: new Date().toISOString()
        }
      });
      formData.append('pinataMetadata', metadata);

      await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'pinata_api_key': apiKey,
          'pinata_secret_api_key': secret,
        },
        body: formData
      });

    } catch (error) {
      console.error('Error creating metadata file:', error);
    }
  };

  const handleLike = async () => {
    if (isLiking || !userEmail) return;
    
    setIsLiking(true);
    
    try {
      let newLikedBy: string[];
      let newLikes: number;
      
      if (hasLiked) {
        newLikedBy = likedBy.filter(email => email !== userEmail);
        newLikes = likes - 1;
        setLikes(newLikes);
        setHasLiked(false);
        toast({
          title: "Like removed",
          description: "Your like has been removed from this post"
        });
      } else {
        newLikedBy = [...likedBy, userEmail];
        newLikes = likes + 1;
        setLikes(newLikes);
        setHasLiked(true);
        onLike(post.id);
        toast({
          title: "Post liked!",
          description: "Your like has been recorded"
        });
      }
      
      setLikedBy(newLikedBy);
      await createMetadataFile(post.id, newLikedBy, viewedBy);
      onUpdateCounts(post.id, newLikes, views, newLikedBy, viewedBy);
      
    } catch (error) {
      console.error('Error updating like:', error);
      toast({
        title: "Failed to update like",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim()) {
      toast({
        title: "Empty reply",
        description: "Please enter some content for your reply",
        variant: "destructive"
      });
      return;
    }

    onReply(post.id, replyContent.trim());
    setReplyContent('');
    setShowReplyForm(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(post.id);
      toast({
        title: "Post deleted",
        description: "Your post has been deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Failed to delete post",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else {
      return 'Just now';
    }
  };

  const renderContentWithMentions = (text: string) => {
    if (!text) return text;
    
    const mentionRegex = /@(\w+(?:\.\w+)*@\w+(?:\.\w+)+|\w+)/g;
    const parts = text.split(mentionRegex);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        const mentionEmail = part.includes('@') ? part : `${part}@example.com`;
        return (
          <span
            key={index}
            className="text-blue-500 hover:text-blue-600 cursor-pointer font-medium"
            onClick={() => handleProfileClick(mentionEmail)}
          >
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  const canDelete = userEmail === post.author;
  const maxReplyDepth = 3;
  const displayName = getDisplayName(post.author);
  const marginLeft = replyDepth > 0 ? `${replyDepth * 1.5}rem` : '0';
  
  return (
    <div style={{ marginLeft }}>
      {isReply && (
        <div className="flex items-center mb-2">
          <div className="w-8 h-px bg-muted-foreground/30"></div>
          <Reply className="w-3 h-3 text-muted-foreground mx-1" />
          <div className="flex-1 h-px bg-muted-foreground/30"></div>
        </div>
      )}
      
      <Card className={`hover:shadow-lg transition-shadow duration-200 ${isReply ? 'border-l-4 border-primary/30 bg-muted/30' : ''}`}>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-8 h-8 bg-gradient-to-r from-primary to-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                  onClick={() => handleProfileClick(post.author)}
                >
                  <span className="text-white text-xs font-bold">
                    {displayName.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p 
                    className="font-medium text-sm cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleProfileClick(post.author)}
                  >
                    {displayName}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatTimestamp(post.timestamp)}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {isReply && (
                  <Badge variant="secondary" className="text-xs">
                    Reply {replyDepth > 0 && `(${replyDepth})`}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  IPFS
                </Badge>
              </div>
            </div>

            {/* Content with mentions */}
            <div className="text-foreground leading-relaxed">
              {renderContentWithMentions(post.content)}
            </div>

            {/* Mentions */}
            {post.mentions && post.mentions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.mentions.map((mention, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-1 bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:bg-blue-500/20"
                    onClick={() => handleProfileClick(mention.includes('@') ? mention : `${mention}@example.com`)}
                  >
                    <AtSign className="h-3 w-3" />
                    <span>{mention}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-1 bg-purple-500/10 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full text-xs font-medium"
                  >
                    <Hash className="h-3 w-3" />
                    <span>{tag}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center space-x-4">
                <Button
                  variant={hasLiked ? "default" : "ghost"}
                  size="sm"
                  onClick={handleLike}
                  disabled={isLiking}
                  className="flex items-center space-x-2"
                >
                  <Heart className={`w-4 h-4 ${hasLiked ? 'fill-current' : ''}`} />
                  <span>{likes}</span>
                </Button>
                
                <div className="flex items-center space-x-1 text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">{views}</span>
                </div>

                {replyDepth < maxReplyDepth && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReplyForm(!showReplyForm)}
                    className="flex items-center space-x-2"
                  >
                    <Reply className="w-4 h-4" />
                    <span>Reply</span>
                  </Button>
                )}
              </div>

              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center space-x-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                </Button>
              )}
            </div>

            {/* Reply Form */}
            {showReplyForm && (
              <div className="pt-4 border-t space-y-3">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write your reply... Use @username to mention others"
                  className="w-full p-3 border rounded-md resize-none bg-background text-foreground"
                  rows={3}
                  maxLength={280}
                />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {replyContent.length}/280 characters
                  </span>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowReplyForm(false);
                        setReplyContent('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleReply}
                      disabled={!replyContent.trim()}
                    >
                      Reply
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
