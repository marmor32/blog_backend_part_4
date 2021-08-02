const dummy = (blogs) => {
    return 1
  }
  

const totalLikes = (blogs) => {
  const reducer = (sum, item) => {
    return sum + item
  }

  return blogs.map(blog => blog.likes).reduce(reducer, 0)
}

const favorite = (blogs) => {
  blogs.sort((a,b) => (a.likes > b.likes) ? -1 : ((b.likes > a.likes) ? 1 : 0))
  return blogs[0]
}

module.exports = {
  dummy, totalLikes, favorite
}