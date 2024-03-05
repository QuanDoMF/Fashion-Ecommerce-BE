
const port = 4000;
const express = require('express')
const app = express()
const mongoose = require("mongoose")
const jwt = require("jsonwebtoken")
const multer = require("multer")
const path = require("path")
const cors = require('cors');
const { v4: uuid } = require('uuid')
app.use(express.json())
app.use(cors())

// Database connection with MongoDB
mongoose.connect("mongodb+srv://tquandoo:Quan2401@cluster0.ok2xmoe.mongodb.net/Ecommerce")

// API creation
app.get("/", (req, res) => {
    res.send("Express App is Running")
})

const storage = multer.diskStorage({
  destination: './upload/images',
  filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
  }
})
const upload = multer({storage: storage})

//creating upload endpoint for images

app.use('/images',express.static('upload/images'))
app.post('/upload',upload.single('product'),(req, res) => {
      res.json({
          success: 1,
          image_url: `https://fashion-ecommerce-be.onrender.com/images/${req.file.filename}`
      })
})  

// schema for creating product
const Product = mongoose.model("Product", {
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image:{
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  new_price: {
    type: Number,
    required: true
  },
  old_price: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  avilabel: {
    type: Boolean,
    default: true,
  }
})

app.post('/addproduct', async (req, res) => {
    let products = await Product.find({})
    let id
    if(products.length > 0) {
        let last_product_array = products.slice(-1)
        last_product = last_product_array[0]
        id = last_product.id + 1;
    }else{
      id = 1
    }
        const product = new Product ({
          id: id, // luôn bằng thằng cuối tăng lên 1
          name: req.body.name,
          image: req.body.image,
          category: req.body.category,
          new_price: req.body.new_price,
          old_price: req.body.old_price,
        })
        await product.save()
        console.log("Saved")
        res.json({
          success: true,
          name: req.body.name
        })
})

// Creating API for deleting product

app.post('/removeproduct', async (req, res) => {
  await Product.findOneAndDelete({
    id: req.body.id
  })
  console.log("Removed")
  res.json({
    success: true,
    name: req.body.name
  })
})
// creating API for getting all products
app.get('/allproduct', async (req, res) => {
  try {
    let start = parseInt(req.query.start) || 0; 
    let limit = parseInt(req.query.limit) || 12; 
    let category = req.query.category; 
    let query = {};
    // Nếu category được chỉ định, thêm nó vào điều kiện truy vấn
    if (category) {
      query.category = category;
    }

    let products;

    // Nếu cả start, limit và category đều được chỉ định, thực hiện lấy sản phẩm theo các điều kiện này
    if (!isNaN(start) && !isNaN(limit) && category) {
      products = await Product.find(query).skip(start).limit(limit);
    } else {
      // Nếu không có cả start, limit hoặc category, hoặc thiếu bất kỳ tham số nào, lấy tất cả sản phẩm
      products = await Product.find({});
    }

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

const Users = mongoose.model('Users' , {
  name: {
      type: String,
      required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  orderList: {
      type: Array,
  },
  cartDetails: {
    type: Array,
    default: [],
  },
  data: {
    type: Date,
    default: Date.now,
  }
});
app.post('/signup', async (req, res) => {
    let check =  await Users.findOne({email: req.body.email})
    if(check) {
      return res.status(400).json({
        success: false,
        errors: 'existing user found with same email'
      }) 
    }
    let cart = {};
    for( let i = 0; i < 300 ; i++){
      cart[i] = 0;
    }
    const user = new Users({
        name: req.body.username,
        email: req.body.email,
        password: req.body.password,
        orderList: [],
        cartData: cart,
    })
    await user.save()
    const data = {
      user: {
        id: user.id,
        username: user.name,
        email: user.email
      }
    }
    const token = jwt.sign(data, 'secret_ecom')
    res.json({ success: true, 
      token, 
      username: user.name, 
      email: user.email
     }); // Sửa ở đây
  }
)

//creating endpoint for user login 
app.post('/login', async (req, res) => {
  let user = await Users.findOne({
    email: req.body.email
  });
  
  if (user) {
    const passCompare = req.body.password === user.password;
    if (passCompare) {
      const data = {
        user: {
          id: user.id,
          username: user.name,
          email: user.email
        }
      };
      const token = jwt.sign(data, 'secret_ecom');
      res.json({ success: true, 
                    token, 
                    username: user.name, 
                    email: user.email }); // Sửa ở đây
    } else {
      res.json({ success: false, errors: 'Wrong Password' });
    }
  } else {
    res.json({ success: false, errors: 'Wrong Email Id' });
  }
});

// creating endpoint for newcollection data
app.get('/popular', async (req, res) => {
  try{
    const limit = 4
    const category = 'women'

    const popularProducts = await Product.find({category}).limit(limit)

    res.json({
      success: true,
      data: popularProducts
    })
  }catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
})
// creating endpoint for newcollection data
// app.get('/newcollection', async (req, res) => {
//   let products = await Product.find({})
//   let newcollection = products.slices
// })

// creating middleware to fetch user

const fetchUser = async (req,res, next) => {
    const token = req.header('auth-token')
    // console.log(token)
    if (!token) {
        res.status(401).send({
          errors: 'Please authenticate using valid token'
        })
    }
      else
      {
          try{
            const data = jwt.verify(token, 'secret_ecom')
            req.user = data.user
            next()
          }catch(error){
            res.status(401).send({errors: "Please authenticate using valid token"})
            console.log(error)
          }
        }
}

// creating endpoint for adding product in cartData
// app.post('/addtocart', fetchUser , async (req, res) => {
//   // console.log('Added', req.body.itemId)
//   let userData = await Users.findOne({_id: req.user.id})
//   if(userData && userData.cartData){
//     userData.cartData[req.body.itemId] += 1
//     await Users.findOneAndUpdate({_id: req.user.id},{cartData: userData.cartData})
//     res.send("Added")
//   }else{
//     console.log('chưa có userData')
//   }
// })
app.post('/addtocart', fetchUser , async (req, res) => {
  // console.log(req.body.cartItem)
  try {
    const userId = req.user.id;
    const itemId = req.body.cartItem.id; // Lấy id của sản phẩm từ request body
    let userData = await Users.findOne({_id: userId});
    // Kiểm tra xem người dùng đã có giỏ hàng hay chưa
    if (!userData.cartDetails) {
      userData.cartDetails = []; // Nếu chưa, khởi tạo giỏ hàng cho người dùng
    }
    // Tìm xem sản phẩm đã tồn tại trong giỏ hàng của người dùng chưa
    const existingItemIndex = userData.cartDetails.findIndex(item => item.id === itemId);
    if (existingItemIndex !== -1) {
      // Nếu sản phẩm đã tồn tại trong giỏ hàng, tăng số lượng lên 1
      userData.cartDetails[existingItemIndex].quantity += 1;
    } else {
      // Nếu sản phẩm chưa tồn tại trong giỏ hàng, thêm sản phẩm vào giỏ hàng với số lượng là 1
      userData.cartDetails.push({
        ...req.body.cartItem,
        quantity: 1
      });
    }
    // Lưu cập nhật giỏ hàng vào cơ sở dữ liệu
    await userData.save();

    res.status(200).send("Item added to cart successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

// app.post('/descrementfromcart', fetchUser , async (req, res) => {
//   console.log('Removed', req.body.itemId)
//   let userData = await Users.findOne({_id: req.user.id})
//   if(userData.cartData[req.body.itemId] > 0) {
//     userData.cartData[req.body.itemId] -= 1
//     await Users.findOneAndUpdate({_id: req.user.id},{cartData: userData.cartData})
//     res.send("Removed")
//   }
// })

// Endpoint để giảm số lượng của một sản phẩm trong giỏ hàng
app.post('/descrementfromcart', fetchUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.body.itemId; // Lấy id của sản phẩm từ request body
    let userData = await Users.findOne({ _id: userId });

    if (!userData) {
      return res.status(404).send("User not found");
    }

    // Tìm chỉ mục của sản phẩm trong giỏ hàng của người dùng
    const itemIndex = userData.cartDetails.findIndex(item => item.id === itemId);
    if (itemIndex !== -1 && userData.cartDetails[itemIndex] && userData.cartDetails[itemIndex].quantity > 0) {
      console.log("quantity before decrement:", userData.cartDetails[itemIndex].quantity);
      
      // Nếu sản phẩm tồn tại trong giỏ hàng và có số lượng lớn hơn 0, giảm số lượng đi 1
      userData.cartDetails[itemIndex].quantity -= 1;
      
      // Lưu cập nhật giỏ hàng vào cơ sở dữ liệu
      await userData.save();
      console.log("quantity after decrement:", userData.cartDetails[itemIndex].quantity);
      console.log('userData', userData)
      
      return res.status(200).send("Item quantity decremented successfully");
    } else {
      return res.status(400).send("No items to decrement");
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal server error");
  }
});




// Endpoint để tăng số lượng của một sản phẩm trong giỏ hàng
app.post('/incrementformcart', fetchUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.body.itemId; // Lấy id của sản phẩm từ request body
    const userData = await Users.findOneAndUpdate(
      { _id: userId, "cartDetails.id": itemId }, // Tìm người dùng với ID và itemId phù hợp
      { $inc: { "cartDetails.$.quantity": 1 } }, // Tăng quantity của mục có itemId tương ứng
      { new: true } // Trả về tài liệu đã cập nhật
    );

    if (userData) {
      return res.status(200).send("Item quantity incremented successfully");
    } else {
      return res.status(400).send("Item not found in cart");
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal server error");
  }
});

// Endpoint để xóa một sản phẩm khỏi giỏ hàng
app.post('/removefromcart', fetchUser , async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.body.itemId; // Lấy id của sản phẩm từ request body
    let userData = await Users.findOne({_id: userId});

    // Kiểm tra xem người dùng có giỏ hàng hay không và giỏ hàng có sản phẩm đó không
    if (userData && userData.cartDetails) {
      const existingItemIndex = userData.cartDetails.findIndex(item => item.id === itemId);
      if (existingItemIndex !== -1) {
        userData.cartDetails.splice(existingItemIndex, 1); // Xóa sản phẩm khỏi giỏ hàng
        await userData.save();
        return res.status(200).send("Item removed from cart successfully");
      }
    }
    // Nếu không tìm thấy sản phẩm, trả về thông báo lỗi
    res.status(400).send("Item not found in cart");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});


// app.post('/removefromcart', fetchUser , async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const itemId = req.body.itemId;

//     let userData = await Users.findOne({_id: userId});

//     if(userData && userData.cartData && userData.cartData[itemId] > 0) {
//       // Xóa hết số lượng sản phẩm trong giỏ hàng cho itemId
//       userData.cartData[itemId] = 0;

//       await Users.findOneAndUpdate({_id: userId}, {cartData: userData.cartData});
//       res.status(200).send("All items removed");
//     } else {
//       res.status(400).send("No items to remove");
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Internal server error");
//   }
// });

// creating endpoint to get cartdata
// creating endpoint to get cartdata

// app.post('/getcart', fetchUser, async (req, res) => {
//   try {
//       // Truy xuất dữ liệu người dùng từ middleware fetchUser
//       const userId = req.user.id;
//       // Tìm người dùng trong cơ sở dữ liệu
//       const userData = await Users.findOne({ _id: userId });

//       console.log('userData', userData)
//       // Kiểm tra xem dữ liệu người dùng và giỏ hàng có tồn tại không
//       if (userData && userData.cartData) {
//           // Nếu tồn tại, trả về dữ liệu giỏ hàng dưới dạng JSON
//           res.json(userData.cartData);
//       } else {
//           // Nếu không tìm thấy dữ liệu người dùng hoặc giỏ hàng, trả về thông báo lỗi
//           res.status(404).json({ success: false, message: 'User or cart data not found' });
//       }
//   } catch (error) {
//       // Xử lý lỗi nếu có bất kỳ lỗi nào xảy ra trong quá trình xử lý yêu cầu
//       console.error(error);
//       res.status(500).json({ success: false, message: 'Internal server error' });
//   }
// });


// creating endpoint for checkout cart
app.post('/orderList', async (req, res) => {
  try{
    const order = req.body
    const user = await Users.findOne({
        email:  order.customerInfo.email
    })
    if(!user){
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }
    const newOrder = { 
      orderId : order.orderId,
      orderInfo : {
        ...order.orderInfo,
        orderDate: order.orderInfo.orderDate
      },
      orderDetails: order.orderDetails,
      customerInfo : order.customerInfo
    }

    user.orderList.push(newOrder)

    await user.save()
    res.status(200).json({
      success: true,
      message: 'Order successfully processed and saved'
    })
  }catch(error){
    console.log(error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})
// endpoint get all orderList

app.get('/orderList', async (req, res) => {
  try {
   
    const users = await Users.find({}, 'orderList');
    const allOrderList = users.map(user => user.orderList);

    const orderList = allOrderList.flat()

    res.status(200).json(orderList);
  } catch (error) {
    console.error('Error while fetching all cartDetails:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, (error) => {
  if(!error){
    console.log("Server Running on port: " + port)
  }else{
    console.log("Error:" + error)
  }
})