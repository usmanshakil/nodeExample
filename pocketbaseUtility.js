const createContactIfExistsAndUpdateTS = (to, from) => {
  return new Promise(async (resolve, reject) => {
    try {
      const checkContactRes = await axios.get(
        `${process.env.PB_URL}/api/collections/contacts/records`,
        {
          params: {
            limit: 1,
            filter: `number = "${to}" && phone = "${from}"`,
          },
        }
      );

      const { totalItems, items } = checkContactRes.data;
      if (totalItems === 0) {
        const getNumberRes = await axios.get(
          `${process.env.PB_URL}/api/collections/numbers/records`,
          {
            params: {
              limit: 1,
              filter: `number = "${to}"`,
            },
          }
        );
        const { items } = getNumberRes.data;
        if (items && items.length > 0) {
          const { user, id: number_id } = items[0];
          const formData = {
            first_name: "New",
            last_name: "Contact",
            number_id,
            user,
            number: to,
            phone: from,
            last_message_timestamp: new Date(),
          };
          await axios.post(
            `${process.env.PB_URL}/api/collections/contacts/records`,
            formData
          );
        }
      }
      // Here we update the latest message timestamp
      else {
        const formData = {
          last_message_timestamp: new Date(),
        };
        await axios.patch(
          `${process.env.PB_URL}/api/collections/contacts/records/${items[0].id}`,
          formData
        );
      }

      resolve(); // Resolve the promise after successful execution
    } catch (err) {
      console.log(err);
      reject(err); // Reject the promise if an error occurs
    }
  });
};
