
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { getUserData } from '@/lib/userService';
import { Hash, X, AtSign } from 'lucide-react';

interface CreatePostProps {
  userEmail: string;
  onPostCreated?: () => void;
}

export const CreatePost = ({ userEmail, onPostCreated }: CreatePostProps) => {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const { toast } = useToast();

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim()) && tags.length < 5) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  // Parse mentions from content
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+(?:\.\w+)*@\w+(?:\.\w+)+|\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      const mention = match[1];
      if (!mentions.includes(mention)) {
        mentions.push(mention);
      }
    }
    return mentions;
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast({
        title: "Empty post",
        description: "Please enter some content for your post",
        variant: "destructive"
      });
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in first",
        variant: "destructive"
      });
      return;
    }

    setIsPosting(true);

    try {
      const userData = await getUserData(user);
      const apiKey = userData?.k;
      const secret = userData?.s;

      if (!apiKey || !secret) {
        toast({
          title: "IPFS keys required",
          description: "Please set up your Pinata keys first in your profile",
          variant: "destructive"
        });
        setIsPosting(false);
        return;
      }

      const mentions = extractMentions(content);
      
      const postData = {
        content: content.trim(),
        author: userEmail,
        timestamp: new Date().toISOString(),
        likes: 0,
        views: 0,
        tags: tags,
        mentions: mentions,
        likedBy: [],
        viewedBy: []
      };

      console.log('Creating post:', postData);

      const blob = new Blob([JSON.stringify(postData)], { type: 'application/json' });
      const formData = new FormData();
      formData.append('file', blob);

      const metadata = JSON.stringify({
        name: `depost-${Date.now()}`,
        keyvalues: {
          type: 'post',
          author: userEmail,
          tags: tags.join(','),
          mentions: mentions.join(',')
        }
      });
      formData.append('pinataMetadata', metadata);

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'pinata_api_key': apiKey,
          'pinata_secret_api_key': secret,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload to Pinata');
      }

      const result = await response.json();
      console.log('Post uploaded to IPFS:', result);

      toast({
        title: "Post created successfully!",
        description: `Your post has been stored on IPFS with CID: ${result.IpfsHash.slice(0, 10)}...`
      });

      setContent('');
      setTags([]);
      
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Failed to create post",
        description: "Could not upload to IPFS. Please check your Pinata keys and try again.",
        variant: "destructive"
      });
    } finally {
      setIsPosting(false);
    }
  };

  // Highlight mentions in the content
  const renderContentWithMentions = (text: string) => {
    if (!text) return text;
    
    const mentionRegex = /@(\w+(?:\.\w+)*@\w+(?:\.\w+)+|\w+)/g;
    const parts = text.split(mentionRegex);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) { // This is a mention
        return (
          <span key={index} className="text-blue-500 font-medium">
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Post</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={content}
              onChange={handleContentChange}
              placeholder="What's on your mind? Use @username to mention others..."
              className="min-h-[120px] resize-none"
              maxLength={500}
            />
            
            {/* Live preview of mentions */}
            {content && (
              <div className="p-2 bg-muted/50 rounded-md text-sm">
                <span className="text-muted-foreground">Preview: </span>
                {renderContentWithMentions(content)}
              </div>
            )}
          </div>
          
          {/* Tags Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Tags (optional)</span>
            </div>
            
            <div className="flex space-x-2">
              <Input
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Add a tag..."
                className="flex-1"
                maxLength={20}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addTag}
                disabled={!currentTag.trim() || tags.length >= 5}
                size="sm"
              >
                Add
              </Button>
            </div>
            
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-1 bg-purple-500/10 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    <Hash className="h-3 w-3" />
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mention help */}
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <AtSign className="h-3 w-3" />
            <span>Type @ followed by a username to mention someone</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {content.length}/500 characters • {tags.length}/5 tags
            </span>
            
            <Button type="submit" disabled={isPosting || !content.trim()}>
              {isPosting ? 'Posting to IPFS...' : 'Create Post'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
