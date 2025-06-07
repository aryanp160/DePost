import React, { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserData } from '@/lib/userService';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Globe, X, Hash, AtSign } from 'lucide-react';

const CreatePost = () => {
  const [user, setUser] = useState<User | null>(null);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

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

  // Extract mentions from content
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

  // Render content with highlighted mentions
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
        author: user?.email || 'Unknown User',
        timestamp: new Date().toISOString(),
        likes: 0,
        views: 0,
        tags: tags,
        mentions: mentions,
        likedBy: [],
        viewedBy: []
      };

      console.log('Creating post with data:', postData);

      const blob = new Blob([JSON.stringify(postData)], { type: 'application/json' });
      const formData = new FormData();
      formData.append('file', blob);

      const metadata = JSON.stringify({
        name: `depost-${Date.now()}`,
        keyvalues: {
          type: 'post',
          author: user?.email || 'Unknown User',
          tags: tags.join(','),
          mentions: mentions.join(',')
        }
      });
      formData.append('pinataMetadata', metadata);

      console.log('Uploading to Pinata with keys:', { apiKey: apiKey.slice(0, 10) + '...', secret: secret.slice(0, 10) + '...' });

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'pinata_api_key': apiKey,
          'pinata_secret_api_key': secret,
        },
        body: formData
      });

      console.log('Pinata response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Pinata error response:', errorText);
        throw new Error(`Failed to upload to Pinata: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('Post uploaded successfully:', result);

      toast({
        title: "Post created successfully!",
        description: `Your post has been stored on IPFS with CID: ${result.IpfsHash.slice(0, 10)}...`
      });

      navigate('/');
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Failed to create post",
        description: error instanceof Error ? error.message : "Could not upload to IPFS. Please check your Pinata keys and try again.",
        variant: "destructive"
      });
    } finally {
      setIsPosting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
          <h1 className="text-2xl font-display font-bold mb-4">Please sign in to create a post</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} onUserChange={setUser} />

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="font-display font-medium">Back to Feed</span>
          </Button>
          
          <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Create Post
          </h1>
          
          <div className="w-20" />
        </div>

        {/* Main Card */}
        <Card className="border-2 border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 shadow-xl">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* User Info */}
              <div className="flex items-center space-x-3 pb-4 border-b border-border/50">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-display font-bold text-lg">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-display font-semibold text-foreground">
                    {user.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-sm text-muted-foreground font-mono">@{user.email?.split('@')[0]}</p>
                </div>
              </div>

              {/* Content Input */}
              <div className="space-y-4">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's happening on the decentralized web? Use @username to mention others..."
                  className="min-h-[200px] resize-none border-0 text-lg placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent font-sans"
                  maxLength={500}
                />
                
                {/* Live preview of content with mentions */}
                {content && (
                  <div className="p-3 bg-muted/50 rounded-md text-sm border">
                    <span className="text-muted-foreground font-medium">Preview: </span>
                    <div className="mt-1">
                      {renderContentWithMentions(content)}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <span className={`text-sm font-mono font-medium ${
                    content.length > 450 ? 'text-destructive' : 
                    content.length > 400 ? 'text-yellow-500' : 
                    'text-muted-foreground'
                  }`}>
                    {content.length}/500
                  </span>
                </div>
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
                
                <p className="text-xs text-muted-foreground">
                  You can add up to 5 tags. Press Enter or comma to add a tag.
                </p>
              </div>

              {/* Mention help */}
              <div className="flex items-center space-x-2 text-xs text-muted-foreground bg-muted/30 rounded-full px-3 py-2 w-fit font-medium">
                <AtSign className="h-4 w-4" />
                <span>Type @ followed by a username to mention someone</span>
              </div>

              {/* Privacy Indicator */}
              <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-muted/30 rounded-full px-3 py-2 w-fit font-medium">
                <Globe className="h-4 w-4" />
                <span>Everyone can see this post</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <div className="flex items-center space-x-4">
                  {/* Media buttons could go here in the future */}
                </div>
                
                <Button
                  type="submit"
                  disabled={isPosting || !content.trim()}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-display font-semibold px-6 py-2 rounded-full transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  size="lg"
                >
                  {isPosting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      <span className="font-display">Posting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      <span className="font-display">Post to IPFS</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card className="mt-6 border border-muted/50">
          <CardContent className="p-4">
            <div className="space-y-2">
              <h3 className="font-display font-semibold text-sm text-muted-foreground flex items-center">
                <Globe className="h-4 w-4 mr-2" />
                Posting to IPFS
              </h3>
              <p className="text-xs text-muted-foreground font-sans">
                Your post will be stored permanently on the InterPlanetary File System (IPFS), 
                making it decentralized and censorship-resistant. Use @username to mention others and tags to help people discover your content.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreatePost;
