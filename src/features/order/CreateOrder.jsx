import { Form, redirect, useActionData, useNavigation } from 'react-router-dom';
import { createOrder } from '../../services/apiRestaurant';
import Button from '../../ui/Button';
import { useDispatch, useSelector } from 'react-redux';
import { clearCart, getCart, getTotalCartPrice } from '../cart/cartSlice';
import EmptyCart from '../cart/EmptyCart';
import store from '../../store';
import { formatCurrency } from '../../utils/helpers';
import { useState } from 'react';
import { fetchAddress } from '../user/userSlice';

//https://www.npmjs.com/package/react-pin-input
import PinInput from 'react-pin-input';

// https://uibakery.io/regex-library/phone-number
const isValidPhone = (str) =>
  /^\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/.test(
    str,
  );

function CreateOrder() {
  const {
    username,
    status: addressStatus,
    position,
    address,
    error: errorAddress,
  } = useSelector((state) => state.user);

  const isLoadingAddress = addressStatus === 'loading';

  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  //Error 4) In a component we can get access to the error with useActionData hook
  const formErrors = useActionData();

  const [withPriority, setWithPriority] = useState(false);
  const [pin, setPin] = useState('');

  const cart = useSelector(getCart);
  const totalCartPrice = useSelector(getTotalCartPrice);
  const priorityPrice = withPriority ? totalCartPrice * 0.2 : 0;
  const totalPrice = totalCartPrice + priorityPrice;

  const dispatch = useDispatch();

  if (!cart.length) return <EmptyCart />;

  return (
    <div className="px-4 py-6">
      <h2 className="mb-8 text-xl font-semibold ">Ready to order? Lets go!</h2>

      {/* 1. Have a Form from react-router-dom */}
      <Form method="POST">
        <div className="mb-5 flex flex-col  gap-2 sm:flex-row sm:items-center">
          <label className="sm:basis-40">First Name</label>
          <input
            className="input grow"
            defaultValue={username}
            type="text"
            name="customer"
            required
          />
        </div>

        <div className="mb-5 flex flex-col  gap-2 sm:flex-row sm:items-center">
          <label className="sm:basis-40">Phone number</label>
          <div className="grow">
            <input className="input w-full" type="tel" name="phone" required />

            {/* Error 5) Render error when needed */}
            {formErrors?.phone && (
              <p className="mt-2 rounded-md bg-red-100 p-2 text-xs text-red-700">
                {formErrors.phone}
              </p>
            )}
          </div>
        </div>

        <div className="relative mb-5 flex flex-col  gap-2 sm:flex-row sm:items-center">
          <label className="sm:basis-40">Address</label>
          <div className="grow">
            <input
              className="input w-full"
              type="text"
              name="address"
              disabled={isLoadingAddress}
              defaultValue={address}
              required
            />
            {addressStatus === 'error' && (
              <p className="mt-2 rounded-md bg-red-100 p-2 text-xs text-red-700">
                {errorAddress}
              </p>
            )}
          </div>
          {!position?.latitude && !position?.longitude && (
            <span className="absolute right-[3px] top-[3px] z-50 sm:right-[5px] sm:top-[5px]">
              <Button
                disabled={isLoadingAddress}
                type="small"
                onClick={(e) => {
                  e.preventDefault();
                  dispatch(fetchAddress());
                }}
              >
                Get position
              </Button>
            </span>
          )}
        </div>

        <div className="mb-5 flex flex-col  gap-2 sm:flex-row sm:items-center">
          <label className="sm:basis-40">PIN</label>
          <PinInput
            length={4}
            initialValue=""
            type="numeric"
            inputMode="number"
            style={{
              padding: '10px',
            }}
            inputStyle={{ borderColor: 'lightgrey', background: 'white' }}
            inputFocusStyle={{ borderColor: '#FACC15' }}
            required
            onComplete={(value, index) => setPin(value)}
            onChange={(value, index) => setPin(value)}
          />
          {formErrors?.pin && (
            <p className="mt-2 rounded-md bg-red-100 p-2 text-xs text-red-700">
              {formErrors.pin}
            </p>
          )}
        </div>

        <div className="mb-12 flex items-center gap-5">
          <input
            className="h-6 w-6 accent-yellow-400 focus:outline-none focus:ring focus:ring-yellow-400 focus:ring-offset-2"
            type="checkbox"
            name="priority"
            id="priority"
            value={withPriority}
            onChange={(e) => setWithPriority(e.target.checked)}
          />
          <label className="font-medium" htmlFor="priority">
            Want to yo give your order priority?
          </label>
        </div>

        <div>
          <input type="hidden" name="cart" value={JSON.stringify(cart)} />
          <input type="hidden" name="pin" value={pin} />
          <input
            type="hidden"
            name="position"
            value={
              position?.longitude && position?.latitude
                ? `${position.latitude}, ${position.longitude}`
                : ''
            }
          />
          <Button type="primary" disabled={isSubmitting}>
            {isSubmitting
              ? 'Placing order...'
              : `Order now for ${formatCurrency(totalPrice)}`}
          </Button>
        </div>
      </Form>
    </div>
  );
}

//2. Have an action to submit the form, a standart to call it "action".
//3. Connect it to the url in router - App.jsx
export async function action({ request }) {
  //4. Catch the request and get data from the form
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  //5. Create a new Order object
  const order = {
    ...data,
    cart: JSON.parse(data.cart),
    priority: data.priority === 'true',
    timeOrdered: Date.now(),
  };

  //* dealing with validation errors
  //Error 1) Create an error object
  const errors = {};
  //Error 2) Validate requeired fields and add that data to the object
  if (!isValidPhone(order.phone))
    errors.phone = 'Please provide a valid phone number';

  if (order.pin.length < 4) errors.pin = 'Please provide a pin of 4 digits';

  //Error 3) Check for errors and then return error object immediatelly without proceeding to new order creation and posting it
  if (Object.keys(errors).length > 0) return errors;

  //6. Submit that data as POST request if no erros
  const newOrder = await createOrder(order);

  //NOTE: IMP: do not overuse this hack - importing Store directly to get access to dispatch actions, as they are awailabel in components only, not in functions. It will create performance issues.
  store.dispatch(clearCart());

  //7. Navigate to a newly created order object
  return redirect(`/order/${newOrder.id}`);
}

export default CreateOrder;
