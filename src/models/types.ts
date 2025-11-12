export interface User {
  id: number;
  name: string;
  email: string;
  created_at: Date;
}

export interface Post {
  id: number;
  user_id: number;
  title: string;
  content: string;
  published_at: Date;
  created_at: Date;
  user?: User;
  comments?: Comment[];
  tags?: Tag[];
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  body: string;
  created_at: Date;
  user?: User;
}

export interface Tag {
  id: number;
  name: string;
}

export interface PostTag {
  id: number;
  post_id: number;
  tag_id: number;
}
