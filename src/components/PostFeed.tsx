import React, { useState, useEffect } from 'react';
import { PostCard } from '@/components/PostCard';
import { useToast } from '@/hooks/use-toast';
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

interface PostFeedProps {
  userEmail?: string;
  authorFilter?: string;
}

interface ThreadPost extends Post {
  replies: ThreadPost[];
}

export const PostFeed = ({ userEmail, authorFilter }: PostFeedProps) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPostsFromPinata();
  }, [authorFilter]);

  const loadPostsFromPinata = async () => {
    setIsLoading(true);
    
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No authenticated user found');
        setPosts([]);
        setIsLoading(false);
        return;
      }

      const userData = await getUserData(user);
      const apiKey = userData?.k;
      const secret = userData?.s;
      
      if (!apiKey || !secret) {
        console.log('No Pinata credentials found in Firebase');
        setPosts([]);
        setIsLoading(false);
        return;
      }

      const response = await fetch('https://api.pinata.cloud/data/pinList?status=pinned', {
        headers: {
          'pinata_api_key': apiKey,
          'pinata_secret_api_key': secret,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch posts from Pinata');
      }

      const data = await response.json();
      console.log('Pinata response:', data);

      // Separate posts and metadata
      const postFiles = data.rows.filter((file: any) => 
        (file.metadata?.name?.startsWith('depost-') || 
         file.metadata?.keyvalues?.type === 'post') &&
        !file.metadata?.name?.includes('updated') &&
        !file.metadata?.keyvalues?.originalId &&
        file.metadata?.keyvalues?.type !== 'metadata'
      );

      const metadataFiles = data.rows.filter((file: any) => 
        file.metadata?.keyvalues?.type === 'metadata'
      );

      // Create a map of latest metadata for each post
      const metadataMap = new Map<string, any>();
      metadataFiles.forEach((file: any) => {
        const postId = file.metadata?.keyvalues?.postId;
        const updatedAt = file.metadata?.keyvalues?.updatedAt;
        
        if (postId) {
          if (!metadataMap.has(postId) || 
              (metadataMap.get(postId).updatedAt < updatedAt)) {
            metadataMap.set(postId, {
              likes: parseInt(file.metadata?.keyvalues?.likes || '0'),
              views: parseInt(file.metadata?.keyvalues?.views || '0'),
              updatedAt: updatedAt,
              cid: file.ipfs_pin_hash
            });
          }
        }
      });

      const postsWithContent = await Promise.all(
        postFiles.map(async (file: any) => {
          try {
            const contentResponse = await fetch(`https://gateway.pinata.cloud/ipfs/${file.ipfs_pin_hash}`);
            const postData = await contentResponse.json();
            
            // Get metadata from metadata files or fallback to file metadata
            const postId = file.ipfs_pin_hash;
            const latestMetadata = metadataMap.get(postId);
            
            let likes = 0;
            let views = 0;
            let likedBy: string[] = [];
            let viewedBy: string[] = [];

            if (latestMetadata) {
              // Get detailed metadata from the metadata file
              try {
                const metadataResponse = await fetch(`https://gateway.pinata.cloud/ipfs/${latestMetadata.cid}`);
                const metadataContent = await metadataResponse.json();
                likes = metadataContent.likes || 0;
                views = metadataContent.views || 0;
                likedBy = metadataContent.likedBy || [];
                viewedBy = metadataContent.viewedBy || [];
              } catch (error) {
                console.error('Error fetching metadata content:', error);
                likes = latestMetadata.likes;
                views = latestMetadata.views;
              }
            } else {
              // Fallback to original metadata
              const metadata = file.metadata?.keyvalues || {};
              const likedByString = metadata.likedBy || '';
              const viewedByString = metadata.viewedBy || '';
              likedBy = likedByString ? likedByString.split(',').filter(Boolean) : [];
              viewedBy = viewedByString ? viewedByString.split(',').filter(Boolean) : [];
              likes = parseInt(metadata.likes) || 0;
              views = parseInt(metadata.views) || 0;
            }
            
            return {
              id: file.ipfs_pin_hash,
              content: postData.content || 'Post content unavailable',
              author: postData.author || 'Unknown',
              timestamp: postData.timestamp || file.date_pinned,
              likes: likes,
              views: views,
              cid: file.ipfs_pin_hash,
              parentId: postData.parentId,
              tags: postData.tags || [],
              mentions: postData.mentions || [],
              likedBy: likedBy,
              viewedBy: viewedBy
            };
          } catch (error) {
            console.error('Error fetching post content:', error);
            return null;
          }
        })
      );

      let validPosts = postsWithContent
        .filter(post => post !== null)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Filter by author if specified
      if (authorFilter) {
        validPosts = validPosts.filter(post => post.author === authorFilter);
      }

      setPosts(validPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
      toast({
        title: "Failed to load posts",
        description: "Could not fetch posts from IPFS storage",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCounts = (postId: string, likes: number, views: number, likedBy: string[], viewedBy: string[]) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, likes, views, likedBy, viewedBy }
          : post
      )
    );
  };

  const handleReply = async (parentId: string, content: string) => {
    if (!userEmail) {
      toast({
        title: "Authentication required",
        description: "Please sign in to reply to posts",
        variant: "destructive"
      });
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to reply to posts",
        variant: "destructive"
      });
      return;
    }

    try {
      const userData = await getUserData(user);
      const apiKey = userData?.k;
      const secret = userData?.s;

      if (!apiKey || !secret) {
        toast({
          title: "IPFS keys required",
          description: "Please set up your Pinata keys first",
          variant: "destructive"
        });
        return;
      }

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

      const mentions = extractMentions(content);

      const replyData = {
        content: content,
        author: userEmail,
        timestamp: new Date().toISOString(),
        likes: 0,
        views: 0,
        parentId: parentId,
        mentions: mentions,
        likedBy: [],
        viewedBy: []
      };

      console.log('Creating reply:', replyData);

      const blob = new Blob([JSON.stringify(replyData)], { type: 'application/json' });
      const formData = new FormData();
      formData.append('file', blob);

      const metadata = JSON.stringify({
        name: `depost-reply-${Date.now()}`,
        keyvalues: {
          type: 'post',
          author: userEmail,
          parentId: parentId,
          mentions: mentions.join(','),
          likes: '0',
          views: '0',
          likedBy: '',
          viewedBy: ''
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
        throw new Error('Failed to upload reply to Pinata');
      }

      const result = await response.json();
      console.log('Reply uploaded to IPFS:', result);

      toast({
        title: "Reply posted successfully!",
        description: `Your reply has been stored on IPFS`
      });

      loadPostsFromPinata();
    } catch (error) {
      console.error('Error creating reply:', error);
      toast({
        title: "Failed to create reply",
        description: "Could not upload to IPFS. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (postId: string) => {
    const user = auth.currentUser;
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to delete posts",
        variant: "destructive"
      });
      return;
    }

    try {
      const userData = await getUserData(user);
      const apiKey = userData?.k;
      const secret = userData?.s;

      if (!apiKey || !secret) {
        toast({
          title: "IPFS keys required",
          description: "Please set up your Pinata keys first",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(`https://api.pinata.cloud/pinning/unpin/${postId}`, {
        method: 'DELETE',
        headers: {
          'pinata_api_key': apiKey,
          'pinata_secret_api_key': secret,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete post from Pinata');
      }

      console.log('Post deleted from IPFS:', postId);

      setPosts(prevPosts => prevPosts.filter(post => 
        post.id !== postId && post.parentId !== postId
      ));

      toast({
        title: "Post deleted successfully!",
        description: "Your post has been removed from IPFS"
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Failed to delete post",
        description: "Could not remove from IPFS. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleLike = async (postId: string) => {
    console.log('Liked post:', postId);
  };

  const handleView = async (postId: string) => {
    console.log('Viewed post:', postId);
  };

  const organizePostsIntoThreads = (posts: Post[]): ThreadPost[] => {
    const postMap = new Map<string, ThreadPost>();
    const rootPosts: ThreadPost[] = [];

    posts.forEach(post => {
      postMap.set(post.id, { ...post, replies: [] });
    });

    posts.forEach(post => {
      const threadPost = postMap.get(post.id)!;
      
      if (post.parentId) {
        const parent = postMap.get(post.parentId);
        if (parent) {
          parent.replies.push(threadPost);
        }
      } else {
        rootPosts.push(threadPost);
      }
    });

    const sortReplies = (post: ThreadPost) => {
      post.replies.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      post.replies.forEach(sortReplies);
    };

    rootPosts.forEach(sortReplies);

    return rootPosts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const renderThread = (post: ThreadPost, depth: number = 0): React.ReactNode => {
    return (
      <React.Fragment key={post.id}>
        <PostCard 
          post={post} 
          userEmail={userEmail}
          onReply={handleReply}
          onDelete={handleDelete}
          onLike={handleLike}
          onView={handleView}
          onUpdateCounts={handleUpdateCounts}
          isReply={depth > 0}
          replyDepth={depth}
        />
        {post.replies.map(reply => renderThread(reply, depth + 1))}
      </React.Fragment>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border rounded-lg p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
              <div className="flex space-x-4">
                <div className="h-4 bg-muted rounded w-16"></div>
                <div className="h-4 bg-muted rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const threaded = organizePostsIntoThreads(posts);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">
          {authorFilter ? `Posts by ${authorFilter.split('@')[0]}` : 'Recent Posts'}
        </h2>
        <button
          onClick={loadPostsFromPinata}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Refresh
        </button>
      </div>
      
      {threaded.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {authorFilter ? 'No posts found for this user.' : 'No posts found. Create your first post to get started!'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {threaded.map(thread => (
            <div key={thread.id} className="space-y-4">
              {renderThread(thread)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
