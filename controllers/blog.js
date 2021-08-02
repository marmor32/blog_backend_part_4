const blogRouter = require('express').Router()
const Blog = require('../models/blog')
const User = require('../models/user')
const jwt = require('jsonwebtoken')

blogRouter.get('/', async (request, response) => {
    const blogs = await Blog.find({}).populate('user', { username: 1, name: 1 })

    response.json(blogs.map(blog => blog.toJSON()))
})
  
blogRouter.post('/', async (request, response) => {
  const user = request.user

  if (!user) {
    return response.status(401).json({error: 'token missing or invalid'})
  }
  
  const blog = new Blog({ ...request.body, user: user._id })
  
    if (typeof blog.likes === 'undefined' || blog.likes === null) {
      blog.likes = 0
    }
    if (typeof blog.title === 'undefined' || blog.title === null || typeof blog.url === 'undefined' || blog.url === null) {
      response.status(400).end()
    } 
    else {
      const result = await blog.save()
      user.blogs = user.blogs.concat(result)
      await user.save()
      response.status(201).json(result.toJSON())
    }
})

blogRouter.delete('/:id', async (request, response) => {
  const id = request.params.id

  const token = request.token
  const decodedToken = jwt.verify(token, process.env.SECRET)
  blog = await Blog.findById(id)
  if (!blog) {
    return response.status(400).end()
  }
  if (blog.user.toString() === decodedToken.id)
  {
    const removed = await Blog.findByIdAndRemove(id)
    if(removed) {
    response.status(204).end()
    }
    else {
      response.status(400).end()
    }
  }
})

blogRouter.put('/:id', async (request, response) => {
  const body = request.body

  const token = request.token
  const decodedToken = jwt.verify(token, process.env.SECRET)

  if (!token || !decodedToken.id) {
    return response.status(401).json({error: 'token missing or invalid'})
  }

  const user = await User.findById(decodedToken.id)

  const blog = {
    title: body.title,
    author: body.author,
    url: body.url,
    likes: body.likes,
    user: body.userId
  }

  const updatedNote = await Blog.findByIdAndUpdate(request.params.id, blog, { new: true })
      response.json(updatedNote)
  if (!user.blogs.find(blog => blog === request.params.id))
    user.blogs = user.blogs.concat( request.params.id)
    await user.save()
})
  
module.exports = blogRouter