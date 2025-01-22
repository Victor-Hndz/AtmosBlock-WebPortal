# reading files
f1 = open('../data/Geopotential_selected_max.csv', "r") 
f2 = open('../data/Geopotential_max.csv', "r") 

f1_data = f1.readlines()
f2_data = f2.readlines()

i = 0

for line1, line2 in zip(f1_data, f2_data):
	i += 1

	# matching line1 from both files
	if line1 == line2: 
		# print IDENTICAL if similar
		print("Line ", i, ": IDENTICAL")	 
	else:
		print("Line ", i, ":")
		# else print that line from both files
		print("\tFile 1:",  line1[2:len(line1)-1], end='')
		print("\tFile 2:", line2[2:len(line2)-1], end='')

# closing files
f1.close()									 
f2.close()									 
