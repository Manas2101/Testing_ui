import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-grouping-structure',
  templateUrl: './grouping-structure.component.html',
  styleUrls: ['./grouping-structure.component.scss']
})
export class GroupingStructureComponent implements OnInit {
  groupingStructureForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.groupingStructureForm = this.fb.group({
      groupingCode: ['', Validators.required]
    });
  }

  ngOnInit(): void {
  }

  onContinue(): void {
    if (this.groupingStructureForm.valid) {
      console.log('Continue clicked', this.groupingStructureForm.value);
    }
  }

  onFind(): void {
    const formData = this.groupingStructureForm.value;
    console.log('Find clicked', formData);
  }

  onSubmit(): void {
    if (this.groupingStructureForm.valid) {
      console.log('Form submitted', this.groupingStructureForm.value);
    }
  }
}
